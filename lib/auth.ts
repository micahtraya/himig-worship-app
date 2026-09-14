import { createClient } from "@/lib/supabase";
import type { HimigRole } from "@/lib/permissions";

export type HimigUser = {
  id: string;
  email: string;
  displayName: string;
  role: HimigRole;
};

function isValidRole(role: string): role is HimigRole {
  return (
    role === "Owner/Admin" ||
    role === "Worship Leader" ||
    role === "Musician" ||
    role === "Viewer"
  );
}

export async function getCurrentHimigUser(): Promise<HimigUser | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .single();

  if (profileError || !profile || !isValidRole(profile.role)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    displayName:
      profile.display_name ||
      user.email ||
      "HIMIG User",
    role: profile.role,
  };
}

export async function signOutHimigUser(): Promise<void> {
  const supabase = createClient();

  await supabase.auth.signOut();
}