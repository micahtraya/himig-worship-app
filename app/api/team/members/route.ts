import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const cookieStore = await cookies();

    /*
     * Create the normal server-side Supabase client.
     * This uses the currently signed-in user's session.
     */
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
            "You must be signed in to view team members.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Verify that the current user is Owner/Admin.
     *
     * Only Owner/Admin should receive the team
     * member email information from this endpoint.
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
            "Only an Owner/Admin can view team member email addresses.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Use the server-side Admin client.
     *
     * SUPABASE_SECRET_KEY is never sent to
     * the browser.
     */
    const adminSupabase =
      createAdminClient();

    /*
     * Get all HIMIG profiles.
     */
    const {
      data: profiles,
      error: profilesError,
    } =
      await adminSupabase
        .from("profiles")
        .select(
          "id, display_name, role, created_at"
        )
        .order("created_at", {
          ascending: true,
        });

    if (profilesError) {
      console.error(
        "Unable to load HIMIG team profiles:",
        profilesError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load team members.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Supabase Auth users are paginated.
     *
     * We collect all users so the Team page does
     * not miss members when the team grows.
     */
    const authUsers = [];
    let page = 1;

    while (true) {
      const {
        data: authData,
        error: authError,
      } =
        await adminSupabase.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

      if (authError) {
        console.error(
          "Unable to load HIMIG Auth users:",
          authError
        );

        return NextResponse.json(
          {
            error:
              "Unable to load team member account information.",
          },
          {
            status: 500,
          }
        );
      }

      authUsers.push(
        ...authData.users
      );

      /*
       * If fewer than 1000 users were returned,
       * we have reached the final page.
       */
      if (
        authData.users.length < 1000
      ) {
        break;
      }

      page += 1;
    }

    /*
     * Create a quick lookup table:
     *
     * user ID -> Auth email
     */
    const emailByUserId =
      new Map<string, string>();

    authUsers.forEach((user) => {
      if (user.email) {
        emailByUserId.set(
          user.id,
          user.email
        );
      }
    });

    /*
     * Combine profile information with the
     * corresponding Auth email.
     *
     * Only safe member information is returned.
     */
    const members =
      (profiles ?? []).map(
        (profile) => ({
          id: profile.id,
          name:
            profile.display_name ||
            "HIMIG User",
          email:
            emailByUserId.get(
              profile.id
            ) || "Team account",
          role: profile.role,
          createdAt:
            profile.created_at,
        })
      );

    return NextResponse.json(
      {
        success: true,
        members,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Unexpected HIMIG team members error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while loading team members.",
      },
      {
        status: 500,
      }
    );
  }
}