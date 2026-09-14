import { createClient } from "@/lib/supabase";

export type Song = {
  id: string;
  title: string;
  artist: string;
  "key": string;
  language: string;
  category: string;
  bpm?: string;
  timeSignature?: string;
  lyrics?: string;
  chords?: string;
  numberCode?: string;
  tabs?: string;
};

/*
 * Built-in song IDs
 *
 * These songs are protected from deletion in the Song Library.
 * The actual song data is now loaded from Supabase.
 */
export const DEFAULT_SONGS: Song[] = [
  {
    id: "1",
    title: "Dakila Ka O Diyos",
    artist: "Worship Team",
    key: "G",
    language: "Tagalog",
    category: "Praise",
    bpm: "",
    timeSignature: "4/4",
    lyrics: "",
    chords: "",
    numberCode: "",
    tabs: "",
  },
  {
    id: "2",
    title: "Goodness of God",
    artist: "Bethel Music",
    key: "G",
    language: "English",
    category: "Worship",
    bpm: "",
    timeSignature: "4/4",
    lyrics: "",
    chords: "",
    numberCode: "",
    tabs: "",
  },
  {
    id: "3",
    title: "Ikaw ang Aming Diyos",
    artist: "Worship Team",
    key: "C",
    language: "Tagalog",
    category: "Worship",
    lyrics: "",
    chords: "",
    numberCode: "",
    tabs: "",
    bpm: "",
    timeSignature: "4/4",
  },
];

export function isBuiltInSong(id: string): boolean {
  return DEFAULT_SONGS.some((song) => song.id === id);
}

/*
 * SUPABASE SONG FUNCTIONS
 */

function mapSupabaseSong(row: Record<string, unknown>): Song {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    artist: String(row.artist ?? ""),
    key: String(row.key ?? ""),
    language: String(row.language ?? ""),
    category: String(row.category ?? ""),
    bpm: row.bpm === null || row.bpm === undefined ? "" : String(row.bpm),
    timeSignature:
      row.time_signature === null || row.time_signature === undefined
        ? ""
        : String(row.time_signature),
    lyrics:
      row.lyrics === null || row.lyrics === undefined
        ? ""
        : String(row.lyrics),
    chords:
      row.chords === null || row.chords === undefined
        ? ""
        : String(row.chords),
    numberCode:
      row.number_code === null || row.number_code === undefined
        ? ""
        : String(row.number_code),
    tabs:
      row.tabs === null || row.tabs === undefined
        ? ""
        : String(row.tabs),
  };
}

export async function getSupabaseSongs(): Promise<Song[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("songs")
    .select(
      'id, title, artist, "key", language, category, bpm, time_signature, lyrics, chords, number_code, tabs'
    )
    .order("title", { ascending: true });

  if (error) {
    console.error("SUPABASE SONGS ERROR:", error);
    console.error("SUPABASE SONGS ERROR MESSAGE:", error.message);
    console.error("SUPABASE SONGS ERROR CODE:", error.code);
    console.error("SUPABASE SONGS ERROR DETAILS:", error.details);
    console.error("SUPABASE SONGS ERROR HINT:", error.hint);

    throw new Error(`Unable to load songs from Supabase: ${error.message}`);
  }

  return (data ?? []).map((row) =>
    mapSupabaseSong(row as Record<string, unknown>)
  );
}

export async function getSupabaseSongById(id: string): Promise<Song | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("songs")
    .select(
      'id, title, artist, "key", language, category, bpm, time_signature, lyrics, chords, number_code, tabs'
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("SUPABASE SONG ERROR:", error);

    throw new Error(`Unable to load song from Supabase: ${error.message}`);
  }

  if (!data) return null;

  return mapSupabaseSong(data as Record<string, unknown>);
}

export async function saveSongToSupabase(song: Song): Promise<Song> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("SUPABASE AUTH ERROR:", userError);

    throw new Error(`Authentication error: ${userError.message}`);
  }

  if (!user) {
    throw new Error("You must be logged in to save a song.");
  }

  const { data, error } = await supabase
    .from("songs")
    .upsert(
      {
        id: song.id,
        title: song.title,
        artist: song.artist,
        key: song.key,
        language: song.language,
        category: song.category,
        bpm: song.bpm ?? "",
        time_signature: song.timeSignature ?? "",
        lyrics: song.lyrics ?? "",
        chords: song.chords ?? "",
        number_code: song.numberCode ?? "",
        tabs: song.tabs ?? "",
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select(
      'id, title, artist, "key", language, category, bpm, time_signature, lyrics, chords, number_code, tabs'
    )
    .single();

  if (error) {
    console.error("SUPABASE SAVE SONG ERROR:", error);
    console.error("SUPABASE SAVE SONG ERROR MESSAGE:", error.message);
    console.error("SUPABASE SAVE SONG ERROR CODE:", error.code);
    console.error("SUPABASE SAVE SONG ERROR DETAILS:", error.details);
    console.error("SUPABASE SAVE SONG ERROR HINT:", error.hint);

    throw new Error(`Unable to save song to Supabase: ${error.message}`);
  }

  return mapSupabaseSong(data as Record<string, unknown>);
}

export async function deleteSongFromSupabase(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("songs")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("SUPABASE DELETE SONG ERROR:", error);
    console.error(
      "SUPABASE DELETE SONG ERROR MESSAGE:",
      error.message
    );
    console.error("SUPABASE DELETE SONG ERROR CODE:", error.code);
    console.error(
      "SUPABASE DELETE SONG ERROR DETAILS:",
      error.details
    );
    console.error("SUPABASE DELETE SONG ERROR HINT:", error.hint);

    throw new Error(`Unable to delete song from Supabase: ${error.message}`);
  }
}