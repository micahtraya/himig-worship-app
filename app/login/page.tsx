
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function checkExistingSession() {
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        router.replace("/");
        return;
      }

      setCheckingSession(false);
    }

    checkExistingSession();
  }, [router]);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const supabase = createClient();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
      return;
    }

    if (!data.user) {
      setLoading(false);
      setErrorMessage(
        "Unable to sign in. Please try again."
      );
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", data.user.id)
        .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setLoading(false);
      setErrorMessage(
        "Your HIMIG profile could not be found. Please contact an Owner/Admin."
      );
      return;
    }

    localStorage.setItem(
      "himigCurrentRole",
      profile.role
    );

    localStorage.setItem(
      "himigCurrentUser",
      JSON.stringify({
        id: data.user.id,
        email: data.user.email ?? "",
        displayName:
          profile.display_name ||
          data.user.email ||
          "HIMIG User",
        role: profile.role,
      })
    );

    setSuccessMessage(
      "Sign in successful. Opening HIMIG..."
    );

    setLoading(false);

    router.replace("/");
    router.refresh();
  }

  /*
   * While checking whether an existing Supabase session
   * already exists, do not briefly show the Login page.
   */
  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-5 text-white">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900 text-3xl">
            ♪
          </div>

          <h1 className="mt-5 font-serif text-3xl font-semibold italic tracking-wide">
            HIMIG
          </h1>

          <p className="mt-3 text-sm text-neutral-600">
            Opening HIMIG...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090909] px-5 text-white">
      <div className="w-full max-w-md">

        {/* BRAND */}
        <div className="mb-8 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900 text-3xl">
            ♪
          </div>

          <h1 className="mt-5 font-serif text-4xl font-semibold italic tracking-wide">
            HIMIG
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            KCCC Psalmist
          </p>

          <p className="mt-1 text-xs text-neutral-600">
            Praise and Worship Songbook
          </p>

        </div>

        {/* LOGIN CARD */}
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl sm:p-8">

          <div className="mb-6">

            <h2 className="text-2xl font-semibold">
              Welcome back
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Sign in to access the KCCC Psalmist worship library.
            </p>

          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* EMAIL */}
            <div>

              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none placeholder:text-neutral-700 transition focus:border-neutral-400"
              />

            </div>

            {/* PASSWORD */}
            <div>

              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none placeholder:text-neutral-700 transition focus:border-neutral-400"
              />

            </div>

            {/* ERROR */}
            {errorMessage && (
              <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm leading-6 text-red-300">
                {errorMessage}
              </div>
            )}

            {/* SUCCESS */}
            {successMessage && (
              <div className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm leading-6 text-neutral-300">
                {successMessage}
              </div>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Signing in..."
                : "Sign in"}
            </button>

          </form>

        </div>

        <p className="mt-6 text-center text-xs text-neutral-700">
          HIMIG • KCCC Psalmist
        </p>

      </div>
    </main>
  );
}