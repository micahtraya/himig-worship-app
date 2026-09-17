import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function DELETE(
  request: Request
) {
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
                ({
                  name,
                  value,
                  options,
                }) => {
                  cookieStore.set(
                    name,
                    value,
                    options
                  );
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
     * Verify the currently signed-in user.
     */
    const {
      data: {
        user: currentUser,
      },
      error: userError,
    } = await supabase.auth.getUser();

    if (
      userError ||
      !currentUser
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed in to perform this action.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Verify that the current user is an
     * Owner/Admin of an organization.
     *
     * The organization membership is the
     * authoritative organization relationship.
     */
    const {
      data: currentMembership,
      error: membershipError,
    } = await supabase
      .from("organization_members")
      .select(
        "organization_id, role"
      )
      .eq(
        "user_id",
        currentUser.id
      )
      .eq(
        "role",
        "Owner/Admin"
      )
      .limit(1)
      .maybeSingle();

    if (
      membershipError ||
      !currentMembership
    ) {
      return NextResponse.json(
        {
          error:
            "Only an Owner/Admin can remove team members.",
        },
        {
          status: 403,
        }
      );
    }

    const organizationId =
      currentMembership.organization_id;

    /*
     * Read the target user ID from
     * the request body.
     */
    const body = await request.json();

    const targetUserId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    if (!targetUserId) {
      return NextResponse.json(
        {
          error:
            "Team member user ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Protect the current Owner/Admin account.
     */
    if (
      targetUserId === currentUser.id
    ) {
      return NextResponse.json(
        {
          error:
            "Your Owner/Admin account cannot be removed from the Team page.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Use the server-side Supabase Admin client.
     *
     * The secret key is never exposed to the browser.
     */
    const adminSupabase =
      createAdminClient();

    /*
     * IMPORTANT:
     * Verify that the target user belongs to
     * the CURRENT organization before performing
     * any destructive action.
     */
    const {
      data: targetMembership,
      error: targetMembershipError,
    } =
      await adminSupabase
        .from("organization_members")
        .select(
          "user_id, role"
        )
        .eq(
          "organization_id",
          organizationId
        )
        .eq(
          "user_id",
          targetUserId
        )
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
        {
          status: 404,
        }
      );
    }

    /*
     * Extra protection:
     * an Owner/Admin account cannot be removed
     * through this Team page.
     */
    if (
      targetMembership.role ===
      "Owner/Admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Owner/Admin accounts cannot be removed from the Team page.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Verify that the target profile exists
     * before deleting the Auth account.
     */
    const {
      data: targetProfile,
      error: targetProfileError,
    } =
      await adminSupabase
        .from("profiles")
        .select(
          "id, display_name, role"
        )
        .eq(
          "id",
          targetUserId
        )
        .single();

    if (
      targetProfileError ||
      !targetProfile
    ) {
      return NextResponse.json(
        {
          error:
            "The selected team member could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Existing HIMIG security functions still
     * use profiles.role, so keep this protection
     * as an additional consistency check.
     */
    if (
      targetProfile.role ===
      "Owner/Admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Owner/Admin accounts cannot be removed from the Team page.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Delete the Supabase Auth account.
     *
     * This is the important part:
     * removing the Auth account prevents the
     * team member from signing in again.
     */
    const {
      error: deleteAuthError,
    } =
      await adminSupabase.auth.admin.deleteUser(
        targetUserId
      );

    if (deleteAuthError) {
      console.error(
        "Unable to delete HIMIG Auth account:",
        deleteAuthError
      );

      return NextResponse.json(
        {
          error:
            deleteAuthError.message ||
            "Unable to remove the team member account.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Clean up the corresponding HIMIG profile.
     *
     * The organization_members row references
     * profiles(id) with ON DELETE CASCADE, so
     * removing the profile also removes the
     * organization membership.
     */
    const {
      error: deleteProfileError,
    } =
      await adminSupabase
        .from("profiles")
        .delete()
        .eq(
          "id",
          targetUserId
        );

    if (deleteProfileError) {
      console.error(
        "Unable to clean up deleted HIMIG profile:",
        deleteProfileError
      );

      /*
       * The Auth account has already been deleted,
       * so the user can no longer sign in.
       *
       * Return success because access has been
       * successfully removed.
       */
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "The team member has been removed from HIMIG.",
        member: {
          id: targetUserId,
          name:
            targetProfile.display_name ||
            "HIMIG User",
          role:
            targetProfile.role,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Unexpected HIMIG team deletion error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while removing the team member.",
      },
      {
        status: 500,
      }
    );
  }
}
