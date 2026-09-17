import { createClient } from "@/lib/supabase";
import type { HimigRole } from "@/lib/permissions";

export type HimigUser = {
  id: string;
  email: string;
  displayName: string;
  role: HimigRole;
  organizationId: string;
  organizationName: string;
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

  /*
   * PROFILE
   *
   * The profile remains the source of the user's
   * HIMIG role and display name.
   */
  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .single();

  if (profileError || !profile || !isValidRole(profile.role)) {
    return null;
  }

  /*
   * ORGANIZATION MEMBERSHIP
   *
   * The user must belong to an organization.
   */
  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

  if (membershipError || !membership) {
    console.error(
      "Unable to load organization membership:",
      membershipError
    );

    return null;
  }

  /*
   * ORGANIZATION
   *
   * Load the organization name using the organization
   * identified by the user's membership.
   */
  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", membership.organization_id)
      .single();

  if (organizationError || !organization) {
    console.error(
      "Unable to load organization:",
      organizationError
    );

    return null;
  }

  /*
   * The organization membership role is now the
   * organization-aware role.
   *
   * We still validate the profile role as well because
   * the existing profile data remains part of HIMIG auth.
   */
  if (!isValidRole(membership.role)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    displayName:
      profile.display_name ||
      user.email ||
      "HIMIG User",
    role: membership.role,
    organizationId: organization.id,
    organizationName: organization.name,
  };
}

export async function signOutHimigUser(): Promise<void> {
  const supabase = createClient();

  await supabase.auth.signOut();
}