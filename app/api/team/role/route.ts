
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabaseAdmin";
import type { HimigRole } from "@/lib/permissions";

const ALLOWED_ROLES: HimigRole[] = [
  "Worship Leader",
  "Musician",
  "Viewer",
];

function isAllowedRole(role: string): role is HimigRole {
  return ALLOWED_ROLES.includes(role as HimigRole);
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },

          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(
                ({ name, value, options }) => {
                  cookieStore.set(name, value, options);
                }
              );
            } catch {
              /*
               * Cookie writes may be ignored when
               * called from a server component context.
               */
            }
          },
        },
      }
    );

    /*
     * 1. Verify the currently authenticated user
     */

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return NextResponse.json(
        {
          error:
            "You must be signed in to perform this action.",
        },
        { status: 401 }
      );
    }

    /*
     * 2. Find the current user's Owner/Admin
     *    organization membership
     */

    const {
      data: currentMembership,
      error: membershipError,
    } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", currentUser.id)
      .eq("role", "Owner/Admin")
      .limit(1)
      .maybeSingle();

    if (membershipError || !currentMembership) {
      return NextResponse.json(
        {
          error:
            "Only an Owner/Admin can change team member roles.",
        },
        { status: 403 }
      );
    }

    const organizationId =
      currentMembership.organization_id;

    /*
     * 3. Read and validate the request
     */

    const body = await request.json();

    const targetUserId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    const newRole =
      typeof body.role === "string"
        ? body.role
        : "";

    if (!targetUserId) {
      return NextResponse.json(
        {
          error:
            "Team member user ID is required.",
        },
        { status: 400 }
      );
    }

    if (!isAllowedRole(newRole)) {
      return NextResponse.json(
        {
          error: "Invalid team member role.",
        },
        { status: 400 }
      );
    }

    if (targetUserId === currentUser.id) {
      return NextResponse.json(
        {
          error:
            "Your Owner/Admin role cannot be changed from the Team page.",
        },
        { status: 400 }
      );
    }

    /*
     * 4. Verify the target belongs to the
     *    current organization
     */

    const {
      data: targetMembership,
      error: targetMembershipError,
    } = await supabase
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (
      targetMembershipError ||
      !targetMembership
    ) {
      return NextResponse.json(
        {
          error:
            "The selected team member does not belong to your organization.",
        },
        { status: 404 }
      );
    }

    /*
     * Do not change an Owner/Admin through the
     * normal team-member role selector.
     */

    if (targetMembership.role === "Owner/Admin") {
      return NextResponse.json(
        {
          error:
            "Owner/Admin accounts cannot be changed from the Team page.",
        },
        { status: 400 }
      );
    }

    /*
     * 5. Update organization membership
     */

    const adminSupabase = createAdminClient();

    const {
      error: membershipUpdateError,
    } = await adminSupabase
      .from("organization_members")
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("user_id", targetUserId);

    if (membershipUpdateError) {
      console.error(
        "Unable to update organization membership role:",
        membershipUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Unable to update this team member's organization role.",
        },
        { status: 500 }
      );
    }

    /*
     * 6. Synchronize profiles.role
     *
     * Existing HIMIG database security functions still
     * depend on profiles.role, so both role records must
     * remain synchronized.
     */

    const {
      error: profileUpdateError,
    } = await adminSupabase
      .from("profiles")
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (profileUpdateError) {
      console.error(
        "Unable to synchronize profile role:",
        profileUpdateError
      );

      /*
       * Roll the organization membership back to its
       * previous role if profile synchronization fails.
       */

      await adminSupabase
        .from("organization_members")
        .update({
          role: targetMembership.role,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organizationId)
        .eq("user_id", targetUserId);

      return NextResponse.json(
        {
          error:
            "The team member's organization role could not be synchronized with the existing HIMIG security profile.",
        },
        { status: 500 }
      );
    }

    /*
     * 7. Success
     */

    return NextResponse.json(
      {
        success: true,
        member: {
          id: targetUserId,
          role: newRole,
          organizationId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Unexpected HIMIG team role update error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while updating the team member's role.",
      },
      { status: 500 }
    );
  }
}
