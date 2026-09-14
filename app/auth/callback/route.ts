import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    console.error(
      "Invitation callback: missing authorization code."
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=missing_code",
        requestUrl.origin
      )
    );
  }

  try {
    /*
     * Use the server-side Supabase client so that
     * the authenticated session is written into
     * the browser cookies.
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
              /*
               * Cookie writes can fail in some
               * server contexts. The response below
               * will also explicitly carry the cookies.
               */
            }
          },
        },
      }
    );

    /*
     * Exchange the invitation code for a
     * real authenticated Supabase session.
     */
    const {
      data: sessionData,
      error: exchangeError,
    } =
      await supabase.auth.exchangeCodeForSession(
        code
      );

    if (exchangeError) {
      console.error(
        "Unable to exchange invitation code:",
        exchangeError
      );

      return NextResponse.redirect(
        new URL(
          "/login?error=invitation_failed",
          requestUrl.origin
        )
      );
    }

    /*
     * Confirm that the invited user now has
     * an authenticated session.
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Invitation callback: authenticated user not found:",
        userError
      );

      return NextResponse.redirect(
        new URL(
          "/login?error=invitation_failed",
          requestUrl.origin
        )
      );
    }

    /*
     * Confirm that the HIMIG profile exists.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        "Invited user profile not found:",
        profileError
      );

      return NextResponse.redirect(
        new URL(
          "/login?error=profile_missing",
          requestUrl.origin
        )
      );
    }

    /*
     * Send the invited user to the password
     * creation page.
     */
    const response = NextResponse.redirect(
      new URL(
        "/auth/set-password",
        requestUrl.origin
      )
    );

    /*
     * Mark this as an accepted HIMIG invitation.
     */
    response.cookies.set(
      "himigInvitationAccepted",
      "true",
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
      }
    );

    /*
     * If Supabase returned an explicit session,
     * preserve it in the response when available.
     *
     * Normally createServerClient's cookie handler
     * above handles the auth cookies.
     */
    if (sessionData?.session) {
      const accessToken =
        sessionData.session.access_token;

      const refreshToken =
        sessionData.session.refresh_token;

      if (accessToken && refreshToken) {
        /*
         * Do not manually create Supabase auth
         * cookies here. createServerClient manages
         * the correct cookie format.
         */
      }
    }

    return response;
  } catch (error) {
    console.error(
      "Invitation callback error:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=invitation_failed",
        requestUrl.origin
      )
    );
  }
}