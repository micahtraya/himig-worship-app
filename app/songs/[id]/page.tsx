
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  canEditChords,
  canEditLyrics,
  canEditNumberCode,
  canEditTabs,
  type HimigRole,
} from "@/lib/permissions";
import { getCurrentHimigUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase";
import type { Song } from "@/lib/songs";
import {
  transposeChordText,
} from "@/lib/chords";

const supabase = createClient();

function mapSong(row: {
  id: string;
  title: string | null;
  artist: string | null;
  key: string | null;
  language: string | null;
  category: string | null;
  bpm: string | number | null;
  time_signature: string | null;
  lyrics: string | null;
  chords: string | null;
  number_code: string | null;
  tabs: string | null;
}): Song {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    artist: String(row.artist ?? ""),
    key: String(row.key ?? ""),
    language: String(row.language ?? ""),
    category: String(row.category ?? ""),
    bpm:
      row.bpm === null || row.bpm === undefined
        ? ""
        : String(row.bpm),
    timeSignature:
      row.time_signature === null ||
      row.time_signature === undefined
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
      row.number_code === null ||
      row.number_code === undefined
        ? ""
        : String(row.number_code),
    tabs:
      row.tabs === null || row.tabs === undefined
        ? ""
        : String(row.tabs),
  };
}

function getSignedKeyDistance(
  fromKey: string,
  toKey: string
): number {
  const keyMap: Record<string, number> = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    F: 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11,
  };

  const normalizedFrom = fromKey.trim();
  const normalizedTo = toKey.trim();

  if (
    !normalizedFrom ||
    !normalizedTo ||
    keyMap[normalizedFrom] === undefined ||
    keyMap[normalizedTo] === undefined
  ) {
    return 0;
  }

  let distance =
    keyMap[normalizedTo] - keyMap[normalizedFrom];

  if (distance > 6) {
    distance -= 12;
  }

  if (distance < -6) {
    distance += 12;
  }

  return distance;
}

export default function SongDetailsPage() {
  const params = useParams();
  const songId = String(params.id ?? "");

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [favorite, setFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] =
    useState(false);

  const [currentRole, setCurrentRole] =
    useState<HimigRole>("Owner/Admin");

  const [personalNote, setPersonalNote] = useState("");
  const [personalNoteId, setPersonalNoteId] =
    useState<string | null>(null);
  const [personalNoteLoading, setPersonalNoteLoading] =
    useState(true);
  const [personalNoteSaving, setPersonalNoteSaving] =
    useState(false);
  const [personalNoteStatus, setPersonalNoteStatus] =
    useState("");

  const [preferredKey, setPreferredKey] = useState("");
  const [capo, setCapo] = useState("");
  const [arrangement, setArrangement] = useState("");
  const [preferenceNotes, setPreferenceNotes] =
    useState("");
  const [preferenceLoading, setPreferenceLoading] =
    useState(true);
  const [preferenceSaving, setPreferenceSaving] =
    useState(false);
  const [preferenceStatus, setPreferenceStatus] =
    useState("");

  useEffect(() => {
    if (!songId) {
      return;
    }

    const timer = window.setTimeout(() => {
      async function loadSongDetails() {
        setLoading(true);
        setErrorMessage("");
        setPersonalNoteLoading(true);
        setPersonalNoteStatus("");
        setPreferenceLoading(true);
        setPreferenceStatus("");

        try {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            setErrorMessage(
              userError?.message ||
                "No authenticated user found."
            );
            setSong(null);
            return;
          }

          const { data, error } = await supabase
            .from("songs")
            .select(
              'id, title, artist, "key", language, category, bpm, time_signature, lyrics, chords, number_code, tabs'
            )
            .eq("id", songId)
            .single();

          if (error || !data) {
            console.error(
              "Unable to load song:",
              error
            );

            setSong(null);
            setErrorMessage(
              error?.message ||
                "The requested song could not be found."
            );
            return;
          }

          const foundSong = mapSong(data);
          setSong(foundSong);

          const {
            data: favoriteData,
            error: favoriteError,
          } = await supabase
            .from("favorites")
            .select("song_id")
            .eq("user_id", user.id)
            .eq("song_id", songId)
            .maybeSingle();

          if (favoriteError) {
            console.error(
              "Unable to load favorite status:",
              favoriteError
            );
          }

          setFavorite(Boolean(favoriteData));

          const {
            data: personalNoteData,
            error: personalNoteError,
          } = await supabase
            .from("personal_notes")
            .select("id, notes")
            .eq("user_id", user.id)
            .eq("song_id", songId)
            .order("updated_at", {
              ascending: false,
            })
            .limit(1)
            .maybeSingle();

          if (personalNoteError) {
            console.error(
              "Unable to load personal note:",
              personalNoteError
            );
          } else if (personalNoteData) {
            setPersonalNoteId(personalNoteData.id);
            setPersonalNote(
              personalNoteData.notes ?? ""
            );
          } else {
            setPersonalNoteId(null);
            setPersonalNote("");
          }

          const {
            data: preferenceData,
            error: preferenceError,
          } = await supabase
            .from("personal_song_preferences")
            .select(
              "id, preferred_key, arrangement, capo, notes"
            )
            .eq("user_id", user.id)
            .eq("song_id", songId)
            .maybeSingle();

          if (preferenceError) {
            console.error(
              "Unable to load personal song preferences:",
              preferenceError
            );
          } else if (preferenceData) {
            setPreferredKey(
              preferenceData.preferred_key ?? ""
            );

            setArrangement(
              preferenceData.arrangement ?? ""
            );

            setCapo(
              preferenceData.capo === null ||
                preferenceData.capo === undefined
                ? ""
                : String(preferenceData.capo)
            );

            setPreferenceNotes(
              preferenceData.notes ?? ""
            );
          } else {
            setPreferredKey("");
            setArrangement("");
            setCapo("");
            setPreferenceNotes("");
          }

          try {
            const himigUser =
              await getCurrentHimigUser();

            if (himigUser) {
              setCurrentRole(himigUser.role);
            }
          } catch (roleError) {
            console.error(
              "Unable to load current HIMIG role:",
              roleError
            );
          }
        } catch (error) {
          console.error(
            "Unexpected error loading song:",
            error
          );

          setSong(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load the song."
          );
        } finally {
          setLoading(false);
          setPersonalNoteLoading(false);
          setPreferenceLoading(false);
        }
      }

      void loadSongDetails();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [songId]);

  async function toggleFavorite() {
    if (favoriteLoading) {
      return;
    }

    try {
      setFavoriteLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert(
          userError?.message ||
            "You must be logged in to manage favorites."
        );
        return;
      }

      if (favorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("song_id", songId);

        if (error) {
          console.error(
            "Unable to remove favorite:",
            error
          );

          alert(
            `Unable to remove favorite: ${error.message}`
          );
          return;
        }

        setFavorite(false);
        return;
      }

      const { error } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          song_id: songId,
        });

      if (error) {
        console.error(
          "Unable to add favorite:",
          error
        );

        alert(
          `Unable to add favorite: ${error.message}`
        );
        return;
      }

      setFavorite(true);
    } catch (error) {
      console.error(
        "Unexpected favorite error:",
        error
      );

      alert(
        "Unable to update favorite. Please try again."
      );
    } finally {
      setFavoriteLoading(false);
    }
  }

  async function savePersonalNote() {
    if (personalNoteSaving) {
      return;
    }

    try {
      setPersonalNoteSaving(true);
      setPersonalNoteStatus("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setPersonalNoteStatus(
          userError?.message ||
            "You must be logged in to save personal notes."
        );
        return;
      }

      const trimmedNote = personalNote.trim();

      if (personalNoteId) {
        const { error } = await supabase
          .from("personal_notes")
          .update({
            notes: trimmedNote,
            updated_at: new Date().toISOString(),
          })
          .eq("id", personalNoteId)
          .eq("user_id", user.id)
          .eq("song_id", songId);

        if (error) {
          console.error(
            "Unable to update personal note:",
            error
          );

          setPersonalNoteStatus(
            `Unable to save note: ${error.message}`
          );
          return;
        }

        setPersonalNoteStatus("Note saved.");
        return;
      }

      const { data, error } = await supabase
        .from("personal_notes")
        .insert({
          user_id: user.id,
          song_id: songId,
          notes: trimmedNote,
        })
        .select("id")
        .single();

      if (error) {
        console.error(
          "Unable to create personal note:",
          error
        );

        setPersonalNoteStatus(
          `Unable to save note: ${error.message}`
        );
        return;
      }

      setPersonalNoteId(data.id);
      setPersonalNoteStatus("Note saved.");
    } catch (error) {
      console.error(
        "Unexpected personal note error:",
        error
      );

      setPersonalNoteStatus(
        "Unable to save note. Please try again."
      );
    } finally {
      setPersonalNoteSaving(false);
    }
  }

  async function savePersonalPreferences() {
    if (preferenceSaving) {
      return;
    }

    try {
      setPreferenceSaving(true);
      setPreferenceStatus("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setPreferenceStatus(
          userError?.message ||
            "You must be logged in to save personal preferences."
        );
        return;
      }

      const trimmedPreferredKey =
        preferredKey.trim();

      const trimmedArrangement =
        arrangement.trim();

      const trimmedPreferenceNotes =
        preferenceNotes.trim();

      const parsedCapo =
        capo.trim() === ""
          ? null
          : Number.parseInt(capo, 10);

      if (
        parsedCapo !== null &&
        (Number.isNaN(parsedCapo) ||
          parsedCapo < 0 ||
          parsedCapo > 12)
      ) {
        setPreferenceStatus(
          "Capo must be a number from 0 to 12."
        );
        return;
      }

      const { error } = await supabase
        .from("personal_song_preferences")
        .upsert(
          {
            user_id: user.id,
            song_id: songId,
            preferred_key:
              trimmedPreferredKey || null,
            arrangement: trimmedArrangement,
            capo: parsedCapo,
            notes: trimmedPreferenceNotes,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,song_id",
          }
        );

      if (error) {
        console.error(
          "Unable to save personal song preferences:",
          error
        );

        setPreferenceStatus(
          `Unable to save preferences: ${error.message}`
        );
        return;
      }

      setPreferenceStatus("Preferences saved.");
    } catch (error) {
      console.error(
        "Unexpected personal preference error:",
        error
      );

      setPreferenceStatus(
        "Unable to save preferences. Please try again."
      );
    } finally {
      setPreferenceSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 px-5 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/songs"
            className="text-sm text-neutral-400 hover:text-white"
          >
            ← Back to Song Library
          </Link>

          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
            <p className="text-neutral-400">
              Loading song...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!song) {
    return (
      <main className="min-h-screen bg-neutral-950 px-5 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800 text-2xl">
              🎵
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Song Not Found
            </h1>

            <p className="mt-3 text-neutral-400">
              {errorMessage ||
                "The song you are looking for could not be found."}
            </p>

            <Link
              href="/songs"
              className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200"
            >
              Back to Song Library
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const canEdit =
    canEditLyrics(currentRole) ||
    canEditChords(currentRole) ||
    canEditNumberCode(currentRole) ||
    canEditTabs(currentRole);

      const preferredKeyValue =
    preferredKey.trim();

  const personalKeyTranspose =
    preferredKeyValue &&
    song.key
      ? getSignedKeyDistance(
          song.key,
          preferredKeyValue
        )
      : 0;

  const displayedChords =
    song.chords
      ? transposeChordText(
          song.chords,
          personalKeyTranspose
        )
      : "";

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">

        {/* TOP NAVIGATION */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/songs"
            className="text-sm text-neutral-400 transition hover:text-white"
          >
            ← Back to Song Library
          </Link>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/favorites"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
            >
              ❤️ Favorites
            </Link>

            {canEdit && (
              <Link
                href={"/songs/edit?id=" + song.id}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
              >
                Edit Song
              </Link>
            )}
          </div>
        </div>

        {/* SONG HEADER */}
        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-xl text-neutral-300">
                  ♫
                </div>

                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white">
                    {song.title}
                  </h1>

                  <p className="mt-1 text-neutral-400">
                    {song.artist || "Unknown Artist"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-200">
                  Key: {song.key || "—"}
                </span>

                {song.language && (
                  <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-400">
                    {song.language}
                  </span>
                )}

                {song.category && (
                  <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-400">
                    {song.category}
                  </span>
                )}

                {song.timeSignature && (
                  <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-400">
                    {song.timeSignature}
                  </span>
                )}

                {song.bpm && (
                  <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-400">
                    {song.bpm} BPM
                  </span>
                )}

                {preferredKeyValue && (
  <span className="rounded-full bg-blue-950/40 px-3 py-1 text-xs text-blue-300">
    My Key: {preferredKeyValue}
  </span>
)}

{capo.trim() && (
  <span className="rounded-full bg-purple-950/40 px-3 py-1 text-xs text-purple-300">
    Capo: {capo}
  </span>
)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void toggleFavorite()}
              disabled={favoriteLoading}
              className={`shrink-0 rounded-xl border px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                favorite
                  ? "border-yellow-700/60 bg-yellow-950/40 text-yellow-300 hover:bg-yellow-950/60"
                  : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              {favorite
                ? "★ Favorited"
                : "☆ Add to Favorites"}
            </button>
          </div>
        </section>

        {/* PERSONAL SONG PREFERENCES */}
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Personal Song Preferences
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Private settings for your own use. These do not change the shared song.
              </p>
            </div>

            {preferenceStatus && (
              <p className="text-sm text-neutral-400">
                {preferenceStatus}
              </p>
            )}
          </div>

          <div className="mt-5">
            {preferenceLoading ? (
              <div className="rounded-xl border border-neutral-800 bg-[#090909] p-5">
                <p className="text-sm text-neutral-500">
                  Loading your preferences...
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="preferred-key"
                      className="text-sm font-medium text-neutral-300"
                    >
                      Preferred Key
                    </label>

                    <input
                      id="preferred-key"
                      type="text"
                      value={preferredKey}
                      onChange={(event) =>
                        setPreferredKey(event.target.value)
                      }
                      placeholder={`Example: ${song.key || "G"}`}
                      className="mt-2 w-full rounded-xl border border-neutral-800 bg-[#090909] px-4 py-3 text-sm text-neutral-200 outline-none transition placeholder:text-neutral-600 focus:border-neutral-600"
                    />

                    <p className="mt-2 text-xs text-neutral-600">
                      Your personal preferred key for this song.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="capo"
                      className="text-sm font-medium text-neutral-300"
                    >
                      Capo
                    </label>

                    <input
                      id="capo"
                      type="number"
                      min="0"
                      max="12"
                      step="1"
                      value={capo}
                      onChange={(event) =>
                        setCapo(event.target.value)
                      }
                      placeholder="0"
                      className="mt-2 w-full rounded-xl border border-neutral-800 bg-[#090909] px-4 py-3 text-sm text-neutral-200 outline-none transition placeholder:text-neutral-600 focus:border-neutral-600"
                    />

                    <p className="mt-2 text-xs text-neutral-600">
                      Leave blank if you do not use a capo.
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="personal-arrangement"
                    className="text-sm font-medium text-neutral-300"
                  >
                    Personal Arrangement
                  </label>

                  <textarea
                    id="personal-arrangement"
                    value={arrangement}
                    onChange={(event) =>
                      setArrangement(event.target.value)
                    }
                    placeholder="Example: Acoustic version, slower intro, skip bridge..."
                    rows={4}
                    className="mt-2 w-full resize-y rounded-xl border border-neutral-800 bg-[#090909] p-4 text-sm leading-7 text-neutral-200 outline-none transition placeholder:text-neutral-600 focus:border-neutral-600"
                  />
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="preference-notes"
                    className="text-sm font-medium text-neutral-300"
                  >
                    Preference Notes
                  </label>

                  <textarea
                    id="preference-notes"
                    value={preferenceNotes}
                    onChange={(event) =>
                      setPreferenceNotes(event.target.value)
                    }
                    placeholder="Add other personal preferences for this song..."
                    rows={4}
                    className="mt-2 w-full resize-y rounded-xl border border-neutral-800 bg-[#090909] p-4 text-sm leading-7 text-neutral-200 outline-none transition placeholder:text-neutral-600 focus:border-neutral-600"
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      void savePersonalPreferences()
                    }
                    disabled={preferenceSaving}
                    className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {preferenceSaving
                      ? "Saving..."
                      : "Save Preferences"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* PERSONAL NOTES */}
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Personal Notes
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Private notes for your own use.
              </p>
            </div>

            {personalNoteStatus && (
              <p className="text-sm text-neutral-400">
                {personalNoteStatus}
              </p>
            )}
          </div>

          <div className="mt-5">
            {personalNoteLoading ? (
              <div className="rounded-xl border border-neutral-800 bg-[#090909] p-5">
                <p className="text-sm text-neutral-500">
                  Loading your notes...
                </p>
              </div>
            ) : (
              <>
                <textarea
                  value={personalNote}
                  onChange={(event) =>
                    setPersonalNote(event.target.value)
                  }
                  placeholder="Add your personal notes for this song..."
                  rows={6}
                  className="w-full resize-y rounded-xl border border-neutral-800 bg-[#090909] p-4 text-sm leading-7 text-neutral-200 outline-none transition placeholder:text-neutral-600 focus:border-neutral-600"
                />

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void savePersonalNote()}
                    disabled={personalNoteSaving}
                    className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {personalNoteSaving
                      ? "Saving..."
                      : "Save Note"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* LYRICS */}
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold">
            Lyrics
          </h2>

          <div className="mt-5 rounded-xl border border-neutral-800 bg-[#090909] p-5">
            {song.lyrics ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-neutral-200">
                {song.lyrics}
              </pre>
            ) : (
              <p className="text-sm text-neutral-600">
                No lyrics available.
              </p>
            )}
          </div>
        </section>

        {/* CHORDS */}
<section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className="text-xl font-semibold">
        Chords
      </h2>

      <p className="mt-1 text-sm text-neutral-500">
        {preferredKeyValue
          ? `Personal chord view in ${preferredKeyValue}.`
          : `Chords for the original song key (${song.key || "—"}).`}
      </p>
    </div>

    {preferredKeyValue && (
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
          Original: {song.key || "—"}
        </span>

        <span className="rounded-full bg-blue-950/40 px-3 py-1 text-xs text-blue-300">
          My Key: {preferredKeyValue}
        </span>

        {capo.trim() && (
          <span className="rounded-full bg-purple-950/40 px-3 py-1 text-xs text-purple-300">
            Capo: {capo}
          </span>
        )}
      </div>
    )}
  </div>

  <div className="mt-5 rounded-xl border border-neutral-800 bg-[#090909] p-5">
    {displayedChords ? (
      <pre className="whitespace-pre-wrap font-mono text-sm leading-7 text-neutral-200">
        {displayedChords}
      </pre>
    ) : (
      <p className="text-sm text-neutral-600">
        No chords available.
      </p>
    )}
  </div>
</section>

        {/* NUMBER CODE */}
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold">
            Nashville Number Code
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Number system for musicians.
          </p>

          <div className="mt-5 rounded-xl border border-neutral-800 bg-[#090909] p-5">
            {song.numberCode ? (
              <pre className="whitespace-pre-wrap font-mono text-sm leading-7 text-neutral-200">
                {song.numberCode}
              </pre>
            ) : (
              <p className="text-sm text-neutral-600">
                No number code available.
              </p>
            )}
          </div>
        </section>

        {/* TABS */}
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-semibold">
            Tabs / Instrument Notes
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Tabs and instrument notes for musicians.
          </p>

          <div className="mt-5 rounded-xl border border-neutral-800 bg-[#090909] p-5">
            {song.tabs ? (
              <pre className="whitespace-pre-wrap font-mono text-sm leading-7 text-neutral-200">
                {song.tabs}
              </pre>
            ) : (
              <p className="text-sm text-neutral-600">
                No tabs or instrument notes available.
              </p>
            )}
          </div>
        </section>

        {/* BOTTOM NAVIGATION */}
        <div className="mt-8">
          <Link
            href="/songs"
            className="inline-flex rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-3 font-semibold text-neutral-200 transition hover:bg-neutral-800"
          >
            ← Song Library
          </Link>
        </div>

      </div>
    </main>
  );
}

