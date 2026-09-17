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
     * Find the current user's Owner/Admin
     * organization membership.
     *
     * This determines which organization this
     * endpoint is allowed to expose.
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
            "Only an Owner/Admin can view team member email addresses.",
        },
        {
          status: 403,
        }
      );
    }

    const organizationId =
      currentMembership.organization_id;

    /*
     * Use the server-side Admin client.
     *
     * SUPABASE_SECRET_KEY is never sent to
     * the browser.
     */
    const adminSupabase =
      createAdminClient();

    /*
     * Get ONLY the profiles that belong to
     * the current organization.
     *
     * organization_members is the authoritative
     * organization membership relationship.
     */
    const {
      data: organizationMembers,
      error: organizationMembersError,
    } =
      await adminSupabase
        .from("organization_members")
        .select(
          "user_id, role, created_at"
        )
        .eq(
          "organization_id",
          organizationId
        )
        .order("created_at", {
          ascending: true,
        });

    if (
      organizationMembersError
    ) {
      console.error(
        "Unable to load organization members:",
        organizationMembersError
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
     * If the organization has no members,
     * return an empty team safely.
     */
    if (
      !organizationMembers ||
      organizationMembers.length === 0
    ) {
      return NextResponse.json(
        {
          success: true,
          members: [],
        },
        {
          status: 200,
        }
      );
    }

    const memberUserIds =
      organizationMembers.map(
        (member) =>
          member.user_id
      );

    /*
     * Get profile information ONLY for users
     * belonging to this organization.
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
        .in(
          "id",
          memberUserIds
        );

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
     *
     * The final result is still restricted to
     * organization member IDs below.
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
     * Create a quick profile lookup table.
     */
    const profileByUserId =
      new Map<
        string,
        {
          id: string;
          display_name: string | null;
          role: string | null;
          created_at: string;
        }
      >();

    (profiles ?? []).forEach(
      (profile) => {
        profileByUserId.set(
          profile.id,
          profile
        );
      }
    );

    /*
     * Build the final organization-scoped
     * member list.
     *
     * organization_members determines who belongs
     * to the organization.
     *
     * profiles provides the display information.
     *
     * Auth provides the email address.
     */
    const members =
      organizationMembers
        .map((membership) => {
          const profile =
            profileByUserId.get(
              membership.user_id
            );

          if (!profile) {
            return null;
          }

          return {
            id: profile.id,
            name:
              profile.display_name ||
              "HIMIG User",
            email:
              emailByUserId.get(
                profile.id
              ) ||
              "Team account",
            role: membership.role,
            createdAt:
              profile.created_at,
          };
        })
        .filter(
          (
            member
          ): member is NonNullable<
            typeof member
          > => member !== null
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
