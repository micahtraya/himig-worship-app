import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    /*
     * Create the Supabase client using the
     * currently logged-in user's browser session.
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
                ({ name, value, options }) => {
                  cookieStore.set(
                    name,
                    value,
                    options
                  );
                }
              );
            } catch {
              // Cookie updates are not required
              // for this API request.
            }
          },
        },
      }
    );

    /*
     * Verify the currently logged-in user.
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Invitation API - auth error:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify the current HIMIG session.",
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            "You must be logged in to invite a team member.",
        },
        { status: 401 }
      );
    }

    /*
     * Verify that the current user is Owner/Admin.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error(
        "Invitation API - profile error:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify your HIMIG role.",
        },
        { status: 403 }
      );
    }

    if (
      !profile ||
      profile.role !== "Owner/Admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Only Owner/Admin can invite team members.",
        },
        { status: 403 }
      );
    }

    /*
     * Read the request body.
     */
    let body: {
      name?: unknown;
      email?: unknown;
      role?: unknown;
    };

    try {
      body = await request.json();
    } catch (error) {
      console.error(
        "Invitation API - invalid request body:",
        error
      );

      return NextResponse.json(
        {
          error:
            "The invitation request contains invalid data.",
        },
        { status: 400 }
      );
    }

    /*
     * Clean the submitted values.
     */
    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const role =
      typeof body.role === "string"
        ? body.role
        : "";

    /*
     * Validate required fields.
     */
    if (!name) {
      return NextResponse.json(
        {
          error:
            "Team member name is required.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Team member email is required.",
        },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        {
          error:
            "Team member role is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Validate HIMIG role.
     *
     * This intentionally uses a simple string array
     * so this API route does not depend on the
     * HimigRole TypeScript type.
     */
    const allowedRoles = [
      "Owner/Admin",
      "Worship Leader",
      "Musician",
      "Viewer",
    ];

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          error:
            "Invalid HIMIG role.",
        },
        { status: 400 }
      );
    }

    /*
     * Create the server-side Supabase Admin client.
     *
     * This uses SUPABASE_SECRET_KEY and must never
     * be imported into a client component.
     */
    const admin = createAdminClient();

    /*
     * Invitation callback URL.
     *
     * Supabase will send the invited member back
     * to this HIMIG route after they accept the email.
     */
    const requestUrl = new URL(
      request.url
    );

    const redirectTo =
      `${requestUrl.origin}/auth/callback`;

    /*
     * Send the Supabase invitation email.
     */
    const {
      data: invitedUser,
      error: inviteError,
    } =
      await admin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo,
        }
      );

    if (inviteError) {
      console.error(
        "Invitation API - Supabase invite error:",
        inviteError
      );

      return NextResponse.json(
        {
          error:
            inviteError.message ||
            "Supabase could not send the invitation.",
        },
        { status: 400 }
      );
    }

    /*
     * Make sure Supabase returned the invited user.
     */
    if (!invitedUser?.user) {
      console.error(
        "Invitation API - no invited user returned."
      );

      return NextResponse.json(
        {
          error:
            "Supabase did not return the invited user.",
        },
        { status: 500 }
      );
    }

    /*
     * Create the HIMIG profile.
     */
    const {
      error: insertError,
    } = await admin
      .from("profiles")
      .insert({
        id: invitedUser.user.id,
        display_name: name,
        role,
      });

    if (insertError) {
      console.error(
        "Invitation API - profile insert error:",
        insertError
      );

      /*
       * Roll back the Auth user if the
       * HIMIG profile could not be created.
       */
      try {
        await admin.auth.admin.deleteUser(
          invitedUser.user.id
        );
      } catch (deleteError) {
        console.error(
          "Invitation API - rollback failed:",
          deleteError
        );
      }

      return NextResponse.json(
        {
          error:
            insertError.message ||
            "The team member profile could not be created.",
        },
        { status: 400 }
      );
    }

    /*
     * Invitation successfully created.
     */
    return NextResponse.json(
      {
        success: true,
        message:
          "Team member invitation sent successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    /*
     * Catch unexpected server errors and ALWAYS
     * return JSON to the browser.
     */
    console.error(
      "Invitation API - unexpected server error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to send the team member invitation. Check the HIMIG server terminal for the detailed error.",
      },
      { status: 500 }
    );
  }
}

/*
 * This endpoint only accepts POST requests.
 */
export async function GET() {
  return NextResponse.json(
    {
      error:
        "This endpoint only accepts POST requests.",
    },
    { status: 405 }
  );
}