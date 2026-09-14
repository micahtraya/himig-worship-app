"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function SetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 6) {
      setLoading(false);

      setErrorMessage(
        "Password must be at least 6 characters."
      );

      return;
    }

    if (password !== confirmPassword) {
      setLoading(false);

      setErrorMessage(
        "Passwords do not match."
      );

      return;
    }

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);

      setErrorMessage(
        "Your invitation session could not be found. Please open the invitation email again."
      );

      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
      setLoading(false);

      setErrorMessage(
        "Your HIMIG profile could not be found. Please contact an Owner/Admin."
      );

      return;
    }

    const { error: passwordError } =
      await supabase.auth.updateUser({
        password,
      });

    if (passwordError) {
      setLoading(false);

      setErrorMessage(
        passwordError.message
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
        id: user.id,
        email: user.email ?? "",
        displayName:
          profile.display_name ||
          user.email ||
          "HIMIG User",
        role: profile.role,
      })
    );

    setSuccessMessage(
      "Password created successfully. Opening HIMIG..."
    );

    setLoading(false);

    setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 700);
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

        {/* PASSWORD CARD */}
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl sm:p-8">

          <div className="mb-6">

            <h2 className="text-2xl font-semibold">
              Set your password
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Welcome to HIMIG. Create your password to access the KCCC Psalmist worship library.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

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
                placeholder="Create a password"
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none placeholder:text-neutral-700 transition focus:border-neutral-400"
              />

            </div>

            {/* CONFIRM PASSWORD */}
            <div>

              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-neutral-300"
              >
                Confirm password
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Enter the password again"
                autoComplete="new-password"
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
                ? "Creating password..."
                : "Create password"}
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