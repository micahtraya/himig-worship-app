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
     * Verify that the current user is
     * an Owner/Admin.
     */
    const {
      data: currentProfile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (
      profileError ||
      !currentProfile ||
      currentProfile.role !== "Owner/Admin"
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
     * Verify that the target profile exists
     * before deleting the Auth account.
     */
    const {
      data: targetProfile,
      error: targetProfileError,
    } =
      await adminSupabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", targetUserId)
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
     * Extra protection:
     * an Owner/Admin account cannot be removed
     * through this Team page.
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
     * In many Supabase setups the profile row
     * may already be removed through a foreign-key
     * cascade when auth.users is deleted.
     *
     * We therefore attempt the cleanup and do not
     * treat an already-missing profile as a failure.
     */
    const {
      error: deleteProfileError,
    } =
      await adminSupabase
        .from("profiles")
        .delete()
        .eq("id", targetUserId);

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
          role: targetProfile.role,
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