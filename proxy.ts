import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              );
            }
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  const isLoginPage =
    pathname === "/login";

  const isAuthCallback =
    pathname === "/auth/callback";

  const isSetPasswordPage =
    pathname === "/auth/set-password";

  /*
   * INVITATION / PASSWORD SETUP
   *
   * These routes must remain accessible during
   * the invited user's first-login process.
   */
  if (
    isAuthCallback ||
    isSetPasswordPage
  ) {
    return supabaseResponse;
  }

  /*
   * NOT LOGGED IN
   *
   * Any protected page should send the user
   * to Login.
   */
  if (!user && !isLoginPage) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.search = "";

    return NextResponse.redirect(
      loginUrl
    );
  }

  /*
   * ALREADY LOGGED IN
   *
   * Don't allow an authenticated user
   * to remain on Login.
   *
   * The password setup page is excluded above,
   * so an invited user can reach it even though
   * Supabase has already authenticated them.
   */
  if (user && isLoginPage) {
    const dashboardUrl =
      request.nextUrl.clone();

    dashboardUrl.pathname = "/";
    dashboardUrl.search = "";

    return NextResponse.redirect(
      dashboardUrl
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run on application routes while excluding
     * Next.js internals and static files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};