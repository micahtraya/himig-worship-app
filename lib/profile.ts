import { createClient } from "./supabase";

export type Profile = {
  id: string;
  display_name: string | null;
  role: "Owner/Admin" | "Worship Leader" | "Musician" | "Viewer";
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("SUPABASE AUTH ERROR:", userError);
    throw new Error(`Auth error: ${userError.message}`);
  }

  if (!user) {
    throw new Error("No authenticated Supabase user found.");
  }

  console.log("AUTH USER ID:", user.id);
  console.log("AUTH USER EMAIL:", user.email);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("SUPABASE PROFILE ERROR:", error);
    throw new Error(`Profile error: ${error.message}`);
  }

  if (!data) {
    throw new Error("Profile query returned no data.");
  }

  console.log("PROFILE DATA:", data);

  return data as Profile;
}