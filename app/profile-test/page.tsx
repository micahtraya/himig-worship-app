"use client";

import { useEffect, useState } from "react";
import { getCurrentProfile, type Profile } from "../../lib/profile";

export default function ProfileTestPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const result = await getCurrentProfile();
        setProfile(result);
      } catch (err) {
        console.error(err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown profile error.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-bold">HIMIG Profile Test</h1>

        <p className="mt-2 text-gray-400">
          Testing Supabase authentication → HIMIG profile.
        </p>

        {loading && (
          <div className="mt-8 rounded-lg border border-gray-700 p-6">
            Loading profile...
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-lg border border-red-500 p-6">
            <p className="font-semibold text-red-400">
              Supabase Profile Error
            </p>

            <p className="mt-3 break-words">{error}</p>
          </div>
        )}

        {profile && (
          <div className="mt-8 rounded-lg border border-green-500 p-6">
            <p className="font-semibold text-green-400">
              Profile loaded successfully!
            </p>

            <div className="mt-6 space-y-3">
              <div>
                <p className="text-sm text-gray-400">Profile ID</p>
                <p className="break-all">{profile.id}</p>
              </div>

              <div>
                <p className="text-sm text-gray-400">Display Name</p>
                <p>{profile.display_name ?? "No display name"}</p>
              </div>

              <div>
                <p className="text-sm text-gray-400">Role</p>
                <p className="font-bold">{profile.role}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}