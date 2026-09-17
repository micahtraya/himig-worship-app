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

function isAllowedRole(
  role: string
): role is HimigRole {
  return ALLOWED_ROLES.includes(
    role as HimigRole
  );
}

export async function POST(
  request: Request
) {
  try {
    /*
     * --------------------------------------------------
     * 1. Verify the currently authenticated user
     * --------------------------------------------------
     */

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
     * --------------------------------------------------
     * 2. Verify Owner/Admin membership and get the
     *    current organization
     * --------------------------------------------------
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

    if (
      membershipError ||
      !currentMembership
    ) {
      return NextResponse.json(
        {
          error:
            "Only an Owner/Admin can create team accounts.",
        },
        {
          status: 403,
        }
      );
    }

    const organizationId =
      currentMembership.organization_id;

    /*
     * --------------------------------------------------
     * 3. Read and validate the request
     * --------------------------------------------------
     */

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const role =
      typeof body.role === "string"
        ? body.role
        : "";

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Team member name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Team member email is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !email.includes("@") ||
      !email.includes(".")
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isAllowedRole(role)) {
      return NextResponse.json(
        {
          error:
            "Invalid team member role.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 4. Create the Supabase Auth account
     * --------------------------------------------------
     */

    const adminSupabase =
      createAdminClient();

    const {
      data: createdAuthUser,
      error: createUserError,
    } =
      await adminSupabase.auth.admin.createUser(
        {
          email,
          password,
          email_confirm: true,
          user_metadata: {
            display_name: name,
          },
        }
      );

    if (
      createUserError ||
      !createdAuthUser.user
    ) {
      console.error(
        "Unable to create HIMIG Auth account:",
        createUserError
      );

      return NextResponse.json(
        {
          error:
            createUserError?.message ||
            "Unable to create the team member account.",
        },
        {
          status: 400,
        }
      );
    }

    const newUserId =
      createdAuthUser.user.id;

    /*
     * --------------------------------------------------
     * 5. Create the HIMIG profile
     *
     * Keep profiles.role synchronized for now because
     * existing database security functions still use
     * profiles.role.
     * --------------------------------------------------
     */

    const {
      error: createProfileError,
    } = await adminSupabase
      .from("profiles")
      .insert({
        id: newUserId,
        display_name: name,
        role,
      });

    if (createProfileError) {
      console.error(
        "Unable to create HIMIG profile:",
        createProfileError
      );

      await adminSupabase.auth.admin.deleteUser(
        newUserId
      );

      return NextResponse.json(
        {
          error:
            "The team account could not be completed because its HIMIG profile could not be created.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 6. Add the user to the current organization
     * --------------------------------------------------
     */

    const {
      error: createMembershipError,
    } = await adminSupabase
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: newUserId,
        role,
      });

    if (createMembershipError) {
      console.error(
        "Unable to create HIMIG organization membership:",
        createMembershipError
      );

      /*
       * Roll back the profile first.
       *
       * The organization_members row was not created
       * successfully, so there is nothing to remove
       * there.
       */
      await adminSupabase
        .from("profiles")
        .delete()
        .eq("id", newUserId);

      /*
       * Roll back the Auth account.
       */
      await adminSupabase.auth.admin.deleteUser(
        newUserId
      );

      return NextResponse.json(
        {
          error:
            "The team account could not be completed because its organization membership could not be created.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 7. Success
     * --------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,
        member: {
          id: newUserId,
          name,
          email,
          role,
          organizationId,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Unexpected HIMIG team account error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while creating the team account.",
      },
      {
        status: 500,
      }
    );
  }
}
