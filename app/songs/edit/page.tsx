"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  canEditLyrics,
  canEditChords,
  canEditNumberCode,
  canEditTabs,
  type HimigRole,
} from "@/lib/permissions";
import { type Song } from "@/lib/songs";
import { getCurrentHimigUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase";

function EditSongForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const songId = searchParams.get("id");

  const [song, setSong] = useState<Song | null>(null);
  const [originalSong, setOriginalSong] =
    useState<Song | null>(null);

  const [currentRole, setCurrentRole] =
    useState<HimigRole>("Owner/Admin");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    async function loadRole() {
      try {
        const user = await getCurrentHimigUser();

        if (user) {
          setCurrentRole(user.role);
        }
      } catch (error) {
        console.error(
          "Unable to load current HIMIG user:",
          error
        );
      }
    }

    void loadRole();
  }, []);

  useEffect(() => {
    if (!songId) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    async function loadSong() {
      setLoading(true);
      setSaveError("");

      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("songs")
          .select(
            'id, title, artist, "key", language, category, bpm, time_signature, lyrics, chords, number_code, tabs'
          )
          .eq("id", songId)
          .single();

        if (error || !data) {
          console.error("Unable to load song:", error);
          setSong(null);
          setOriginalSong(null);
          return;
        }

        const foundSong: Song = {
          id: String(data.id ?? ""),
          title: String(data.title ?? ""),
          artist: String(data.artist ?? ""),
          key: String(data.key ?? ""),
          language: String(data.language ?? ""),
          category: String(data.category ?? ""),
          bpm:
            data.bpm === null ||
            data.bpm === undefined
              ? ""
              : String(data.bpm),
          timeSignature:
            data.time_signature === null ||
            data.time_signature === undefined
              ? ""
              : String(data.time_signature),
          lyrics:
            data.lyrics === null ||
            data.lyrics === undefined
              ? ""
              : String(data.lyrics),
          chords:
            data.chords === null ||
            data.chords === undefined
              ? ""
              : String(data.chords),
          numberCode:
            data.number_code === null ||
            data.number_code === undefined
              ? ""
              : String(data.number_code),
          tabs:
            data.tabs === null ||
            data.tabs === undefined
              ? ""
              : String(data.tabs),
        };

        setSong(foundSong);
        setOriginalSong({ ...foundSong });
      } catch (error) {
        console.error("Unable to load song:", error);
        setSong(null);
        setOriginalSong(null);
      } finally {
        queueMicrotask(() => setLoading(false));
      }
    }

    void loadSong();
  }, [songId]);

  function updateField(
    field: keyof Song,
    value: string
  ) {
    if (!song) {
      return;
    }

    setSong({
      ...song,
      [field]: value,
    });
  }

  async function saveSong(event: React.FormEvent) {
    event.preventDefault();

    if (!song || !originalSong || saving) {
      return;
    }

    setSaveError("");

    const owner =
      currentRole === "Owner/Admin";

    const lyricsAllowed =
      canEditLyrics(currentRole);

    const chordsAllowed =
      canEditChords(currentRole);

    const numberCodeAllowed =
      canEditNumberCode(currentRole);

    const tabsAllowed =
      canEditTabs(currentRole);

    /*
      Build the final song carefully.

      Only fields that the current role is allowed
      to edit will be sent from the edited form.

      Everything else comes from the original song.

      Supabase also has a database trigger that
      enforces these permissions server-side.
    */
    const songToSave: Song = {
      ...originalSong,

      ...(owner
        ? {
            title: song.title,
            artist: song.artist,
            key: song.key,
            language: song.language,
            category: song.category,
            bpm: song.bpm,
            timeSignature: song.timeSignature,
          }
        : {}),

      ...(lyricsAllowed
        ? {
            lyrics: song.lyrics,
          }
        : {}),

      ...(chordsAllowed
        ? {
            chords: song.chords,
          }
        : {}),

      ...(numberCodeAllowed
        ? {
            numberCode: song.numberCode,
          }
        : {}),

      ...(tabsAllowed
        ? {
            tabs: song.tabs,
          }
        : {}),
    };

    try {
      setSaving(true);

      const supabase = createClient();

      const { error } = await supabase
        .from("songs")
        .update({
          title: songToSave.title,
          artist: songToSave.artist,
          key: songToSave.key,
          language: songToSave.language,
          category: songToSave.category,
          bpm: songToSave.bpm ?? "",
          time_signature:
            songToSave.timeSignature ?? "",
          lyrics: songToSave.lyrics ?? "",
          chords: songToSave.chords ?? "",
          number_code:
            songToSave.numberCode ?? "",
          tabs: songToSave.tabs ?? "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", song.id);

      if (error) {
        console.error(
          "Unable to save song:",
          error
        );

        setSaveError(
          error.message ||
            "Unable to save the song."
        );

        return;
      }

      router.push("/songs/" + song.id);
    } catch (error) {
      console.error(
        "Unexpected error while saving song:",
        error
      );

      setSaveError(
        "Unable to save the song. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 px-5 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-neutral-400">
            Loading song...
          </p>
        </div>
      </main>
    );
  }

  if (
    currentRole === "Viewer" ||
    (!canEditLyrics(currentRole) &&
      !canEditChords(currentRole) &&
      !canEditNumberCode(currentRole) &&
      !canEditTabs(currentRole))
  ) {
    return (
      <main className="min-h-screen bg-neutral-950 px-5 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-900/50 bg-neutral-900 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-950 text-2xl">
              🔒
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Permission Denied
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-neutral-400">
              Your current HIMIG role does not have
              permission to edit this song.
            </p>

            <div className="mt-5 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Current Role
              </p>

              <p className="mt-1 font-semibold text-white">
                {currentRole}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/songs")
              }
              className="mt-6 rounded-lg bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200"
            >
              Back to Song Library
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!song) {
    return (
      <main className="min-h-screen bg-neutral-950 px-5 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
            <h1 className="text-2xl font-bold">
              Song Not Found
            </h1>

            <p className="mt-2 text-neutral-400">
              The song you are trying to edit does
              not exist.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/songs")
              }
              className="mt-6 rounded-lg bg-white px-5 py-3 font-semibold text-black hover:bg-neutral-200"
            >
              Back to Song Library
            </button>
          </div>
        </div>
      </main>
    );
  }

  const owner =
    currentRole === "Owner/Admin";

  const lyricsEditable =
    canEditLyrics(currentRole);

  const chordsEditable =
    canEditChords(currentRole);

  const numberCodeEditable =
    canEditNumberCode(currentRole);

  const tabsEditable =
    canEditTabs(currentRole);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-10">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/songs/" + song.id
              )
            }
            className="text-left text-sm font-medium text-neutral-400 hover:text-white"
          >
            ← Back to Song
          </button>

          <div className="w-fit rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2">
            <p className="text-xs text-neutral-500">
              Current Role
            </p>

            <p className="text-sm font-semibold text-white">
              {currentRole}
            </p>
          </div>
        </div>

        {/* Page Title */}
        <div className="mt-8">
          <h1 className="text-3xl font-bold">
            Edit Song
          </h1>

          <p className="mt-1 text-neutral-400">
            Update the parts of the song allowed by
            your HIMIG role.
          </p>
        </div>

        {saveError && (
          <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {saveError}
          </div>
        )}

        <form
          onSubmit={saveSong}
          className="mt-8 space-y-6"
        >

          {/* Basic Information */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Basic Information
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {owner
                    ? "Owner/Admin can edit all song information."
                    : "Basic song information is read-only for your role."}
                </p>
              </div>

              {!owner && (
                <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-400">
                  🔒 Read-only
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              {/* Song Title */}
              <div>
                <label className="text-sm text-neutral-300">
                  Song Title
                </label>

                <input
                  type="text"
                  value={song.title}
                  onChange={(event) =>
                    updateField(
                      "title",
                      event.target.value
                    )
                  }
                  disabled={!owner}
                  required
                  className={`mt-2 w-full rounded-lg border px-4 py-3 text-white outline-none ${
                    owner
                      ? "border-neutral-700 bg-[#090909] focus:border-neutral-400"
                      : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-500"
                  }`}
                />
              </div>

              {/* Artist */}
              <div>
                <label className="text-sm text-neutral-300">
                  Artist
                </label>

                <input
                  type="text"
                  value={song.artist}
                  onChange={(event) =>
                    updateField(
                      "artist",
                      event.target.value
                    )
                  }
                  disabled={!owner}
                  required
                  className={`mt-2 w-full rounded-lg border px-4 py-3 text-white outline-none ${
                    owner
                      ? "border-neutral-700 bg-[#090909] focus:border-neutral-400"
                      : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-500"
                  }`}
                />
              </div>

              {/* Key */}
              <div>
                <label className="text-sm text-neutral-300">
                  Original Key
                </label>

                <input
                  type="text"
                  value={song.key}
                  onChange={(event) =>
                    updateField(
                      "key",
                      event.target.value
                    )
                  }
                  disabled={!owner}
                  required
                  className={`mt-2 w-full rounded-lg border px-4 py-3 text-white outline-none ${
                    owner
                      ? "border-neutral-700 bg-[#090909] focus:border-neutral-400"
                      : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-500"
                  }`}
                />
              </div>

              {/* Language */}
              <div>
                <label className="text-sm text-neutral-300">
                  Language
                </label>

                <select
                  value={song.language}
                  onChange={(event) =>
                    updateField(
                      "language",
                      event.target.value
                    )
                  }
                  disabled={!owner}
                  required
                  className={`mt-2 w-full rounded-lg border px-4 py-3 text-white outline-none ${
                    owner
                      ? "border-neutral-700 bg-[#090909] focus:border-neutral-400"
                      : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-500"
                  }`}
                >
                  <option value="English">
                    English
                  </option>

                  <option value="Tagalog">
                    Tagalog
                  </option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm text-neutral-300">
                  Category
                </label>

                <select
                  value={song.category}
                  onChange={(event) =>
                    updateField(
                      "category",
                      event.target.value
                    )
                  }
                  disabled={!owner}
                  required
                  className={`mt-2 w-full rounded-lg border px-4 py-3 text-white outline-none ${
                    owner
                      ? "border-neutral-700 bg-[#090909] focus:border-neutral-400"
                      : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-500"
                  }`}
                >
                  <option value="Worship">
                    Worship
                  </option>

                  <option value="Praise">
                    Praise
                  </option>

                  <option value="Prayer">
                    Prayer
                  </option>

                  <option value="Christmas">
                    Christmas
                  </option>

                  <option value="Easter">
                    Easter
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* BPM */}
              <div>
                <label className="text-sm text-neutral-300">
                  BPM
                </label>

                <input
                  type="text"
                  value={song.bpm || ""}
                  onChange={(event) =>
                    updateField(
                      "bpm",
                      event.target.value
                    )
                  }
                  disabled={!owner}
                  placeholder="Optional"
                  className={`mt-2 w-full rounded-lg border px-4 py-3 text-white outline-none ${
                    owner
                      ? "border-neutral-700 bg-[#090909] placeholder:text-neutral-600 focus:border-neutral-400"
                      : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-500"
                  }`}
                />
              </div>

              {/* Time Signature */}
              <div>
                <label className="text-sm text-neutral-300">
                  Time Signature
                </label>

                <select
                  value={
                    song.timeSignature ||
                    "4/4"
                  }
                  onChange={(event) =>
                    updateField(
                      "timeSignature",
                      event.target.value
                    )
                  }
                  disabled={!owner}
                  required
                  className={`mt-2 w-full rounded-lg border px-4 py-3 text-white outline-none ${
                    owner
                      ? "border-neutral-700 bg-[#090909] focus:border-neutral-400"
                      : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-500"
                  }`}
                >
                  <option value="4/4">
                    4/4
                  </option>

                  <option value="3/4">
                    3/4
                  </option>

                  <option value="6/8">
                    6/8
                  </option>

                  <option value="2/4">
                    2/4
                  </option>

                  <option value="12/8">
                    12/8
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Lyrics */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Lyrics
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Worship Leaders can edit lyrics.
                </p>
              </div>

              {lyricsEditable ? (
                <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                  ✏️ Editable
                </span>
              ) : (
                <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-500">
                  🔒 Read-only
                </span>
              )}
            </div>

            <textarea
              value={song.lyrics || ""}
              onChange={(event) =>
                updateField(
                  "lyrics",
                  event.target.value
                )
              }
              disabled={!lyricsEditable}
              rows={12}
              placeholder={
                lyricsEditable
                  ? "Enter lyrics here..."
                  : "Lyrics can only be edited by Owner/Admin or Worship Leader."
              }
              className={`mt-5 w-full rounded-lg border px-4 py-3 font-mono text-sm leading-6 text-white outline-none ${
                lyricsEditable
                  ? "border-neutral-700 bg-[#090909] placeholder:text-neutral-600 focus:border-neutral-400"
                  : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-500 placeholder:text-neutral-700"
              }`}
            />
          </div>

          {/* Chords */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Chords
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Musicians can review and correct
                  AI-generated chords.
                </p>
              </div>

              {chordsEditable ? (
                <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                  ✏️ Editable
                </span>
              ) : (
                <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-500">
                  🔒 Read-only
                </span>
              )}
            </div>

            <textarea
              value={song.chords || ""}
              onChange={(event) =>
                updateField(
                  "chords",
                  event.target.value
                )
              }
              disabled={!chordsEditable}
              rows={12}
              placeholder={
                chordsEditable
                  ? "AI-generated chords will appear here. Musicians can correct them when needed."
                  : "Chords can only be edited by Owner/Admin or Musician."
              }
              className={`mt-5 w-full rounded-lg border px-4 py-3 font-mono text-sm leading-6 text-white outline-none ${
                chordsEditable
                  ? "border-neutral-700 bg-[#090909] placeholder:text-neutral-600 focus:border-neutral-400"
                  : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-500 placeholder:text-neutral-700"
              }`}
            />
          </div>

          {/* Number Code */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Nashville Number Code
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Musicians can review and correct
                  the generated number code.
                </p>
              </div>

              {numberCodeEditable ? (
                <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                  ✏️ Editable
                </span>
              ) : (
                <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-500">
                  🔒 Read-only
                </span>
              )}
            </div>

            <textarea
              value={song.numberCode || ""}
              onChange={(event) =>
                updateField(
                  "numberCode",
                  event.target.value
                )
              }
              disabled={!numberCodeEditable}
              rows={8}
              placeholder={
                numberCodeEditable
                  ? "AI-generated number code will appear here. Example: 1 - 5 - 6m - 4"
                  : "Number Code can only be edited by Owner/Admin or Musician."
              }
              className={`mt-5 w-full rounded-lg border px-4 py-3 font-mono text-sm leading-6 text-white outline-none ${
                numberCodeEditable
                  ? "border-neutral-700 bg-[#090909] placeholder:text-neutral-600 focus:border-neutral-400"
                  : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-500 placeholder:text-neutral-700"
              }`}
            />
          </div>

          {/* Tabs */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Tabs / Instrument Notes
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Musicians can review and correct
                  tabs and instrument notes.
                </p>
              </div>

              {tabsEditable ? (
                <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                  ✏️ Editable
                </span>
              ) : (
                <span className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-500">
                  🔒 Read-only
                </span>
              )}
            </div>

            <textarea
              value={song.tabs || ""}
              onChange={(event) =>
                updateField(
                  "tabs",
                  event.target.value
                )
              }
              disabled={!tabsEditable}
              rows={10}
              placeholder={
                tabsEditable
                  ? "AI-generated tabs or instrument notes will appear here. Musicians can correct them when needed."
                  : "Tabs can only be edited by Owner/Admin or Musician."
              }
              className={`mt-5 w-full rounded-lg border px-4 py-3 font-mono text-sm leading-6 text-white outline-none ${
                tabsEditable
                  ? "border-neutral-700 bg-[#090909] placeholder:text-neutral-600 focus:border-neutral-400"
                  : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-500 placeholder:text-neutral-700"
              }`}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/songs/" + song.id
                )
              }
              disabled={saving}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-6 py-3 font-semibold text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>

          </div>
        </form>
      </div>
    </main>
  );
}

export default function EditSongPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-neutral-950 px-5 py-10 text-white">
          <div className="mx-auto max-w-4xl">
            <p className="text-neutral-400">
              Loading...
            </p>
          </div>
        </main>
      }
    >
      <EditSongForm />
    </Suspense>
  );
}