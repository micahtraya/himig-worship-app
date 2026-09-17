
"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  canAdd,
  canEditLyrics,
  canEditChords,
  canEditNumberCode,
  canEditTabs,
  canGenerateMusicData,
  type HimigRole,
} from "@/lib/permissions";

import type { Song } from "@/lib/songs";

import { createClient } from "@/lib/supabase";

import { extractSongContent } from "@/lib/song-import";

import { getCurrentHimigUser } from "@/lib/auth";

/*
 * Basic guitar chord shapes.
 *
 * These are intentionally limited to common,
 * reliable open-position shapes.
 *
 * HIMIG does not claim these are the exact
 * voicings used in the original recording.
 *
 * Musicians can review and edit them.
 */
const BASIC_GUITAR_SHAPES: Record<string, string> = {
  C: "x32010",
  Cm: "x35543",
  C7: "x32310",
  Cmaj7: "x32000",
  Cadd9: "x32033",

  D: "xx0232",
  Dm: "xx0231",
  D7: "xx0212",
  Dmaj7: "xx0222",
  Dsus2: "xx0230",
  Dsus4: "xx0233",

  E: "022100",
  Em: "022000",
  E7: "020100",
  Emaj7: "021100",
  Esus4: "022200",

  F: "133211",
  Fm: "133111",
  F7: "131211",
  Fmaj7: "xx3210",

  G: "320003",
  Gm: "355333",
  G7: "320001",
  Gmaj7: "320002",
  Gsus4: "330013",

  A: "x02220",
  Am: "x02210",
  A7: "x02020",
  Amaj7: "x02120",
  Asus2: "x02200",
  Asus4: "x02230",

  B: "x24442",
  Bm: "x24432",
  B7: "x21202",
  Bsus4: "x24452",

  "C#": "x46664",
  "C#m": "x46654",
  "C#7": "x46464",

  Db: "x46664",
  Dbm: "x46654",

  "D#": "x68886",
  "D#m": "x68876",

  Eb: "x68886",
  Ebm: "x68876",

  "F#": "244322",
  "F#m": "244222",
  "F#7": "242322",

  Gb: "244322",
  Gbm: "244222",

  "G#": "466544",
  "G#m": "466444",

  Ab: "466544",
  Abm: "466444",

  "A#": "x13331",
  "A#m": "x13321",

  Bb: "x13331",
  Bbm: "x13321",
};

function normalizeChordForShape(chord: string): string {
  return chord
    .trim()
    .replace(/\/[A-G](?:#|b)?$/, "");
}

function extractChordsFromText(text: string): string[] {
  const tokens = text
    .replace(/\r\n/g, "\n")
    .split(/\s+/)
    .map((token) =>
      token
        .replace(/^[([{]+/, "")
        .replace(/[)\]},:;]+$/, "")
    )
    .filter(Boolean);

  const chordPattern =
    /^[A-G](?:#|b)?(?:m|min|maj|dim|aug|sus|sus2|sus4|7|9|11|13|maj7|maj9|maj11|maj13|m7|m9|m11|m13|min7|min9|min11|min13|dim7|m7b5|6|m6|add9|add11|add13|6\/9|m6\/9)?(?:[b#](?:5|9|11|13))?(?:\/[A-G](?:#|b)?)?$/;

  return tokens.filter((token) => chordPattern.test(token));
}

/*
 * Generate a basic guitar guide from the
 * already-recognized chord data.
 *
 * This does NOT attempt to transcribe the
 * original recording.
 */
function generateBasicTabGuide(chordText: string): string {
  const chords = extractChordsFromText(chordText);

  const uniqueChords: string[] = [];

  for (const chord of chords) {
    if (!uniqueChords.includes(chord)) {
      uniqueChords.push(chord);
    }
  }

  if (uniqueChords.length === 0) {
    return "";
  }

  const output: string[] = [];

  output.push("GUITAR CHORD / TAB GUIDE");

  output.push(
    "Basic reference generated from the recognized chords."
  );

  output.push(
    "Review and adjust these shapes before use."
  );

  output.push("");

  for (const chord of uniqueChords) {
    const baseChord =
      normalizeChordForShape(chord);

    const shape =
      BASIC_GUITAR_SHAPES[baseChord];

    output.push(`[${chord}]`);

    if (shape) {
      output.push(`e|-${shape[5] ?? "-"}-`);
      output.push(`B|-${shape[4] ?? "-"}-`);
      output.push(`G|-${shape[3] ?? "-"}-`);
      output.push(`D|-${shape[2] ?? "-"}-`);
      output.push(`A|-${shape[1] ?? "-"}-`);
      output.push(`E|-${shape[0] ?? "-"}-`);
    } else {
      output.push(
        "Chord shape: musician review required"
      );
    }

    output.push("");
  }

  return output.join("\n").trim();
}

export default function NewSongPage() {
  const router = useRouter();

  const [currentRole, setCurrentRole] =
    useState<HimigRole | null>(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [songKey, setSongKey] = useState("G");
  const [language, setLanguage] =
    useState("English");
  const [category, setCategory] =
    useState("Worship");
  const [bpm, setBpm] = useState("");
  const [timeSignature, setTimeSignature] =
    useState("4/4");

  const [lyrics, setLyrics] = useState("");
  const [chords, setChords] = useState("");
  const [numberCode, setNumberCode] =
    useState("");
  const [tabs, setTabs] = useState("");

  const [saving, setSaving] = useState(false);
  const [imported, setImported] =
    useState(false);

  useEffect(() => {
    async function loadRole() {
      try {
        const user =
          await getCurrentHimigUser();

        if (user) {
          setCurrentRole(user.role);
        } else {
          setCurrentRole("Viewer");
        }
      } catch (error) {
        console.error(
          "Unable to load current HIMIG user:",
          error
        );

        setCurrentRole("Viewer");
      }
    }

    void loadRole();
  }, []);

  /*
   * Analyze song content.
   *
   * Only roles with generateMusicData permission
   * may run HIMIG's music-data generation.
   *
   * Owner/Admin:
   *   Can generate.
   *
   * Worship Leader:
   *   Cannot generate.
   *
   * Musician:
   *   Can generate.
   *
   * Viewer:
   *   Cannot add songs and cannot generate.
   */
  function handleAnalyzeContent() {
    if (
      !currentRole ||
      !canGenerateMusicData(currentRole)
    ) {
      alert(
        "Your current HIMIG role does not have permission to generate music data."
      );
      return;
    }

    if (!lyrics.trim()) {
      alert(
        "Please paste the lyrics first."
      );
      return;
    }

    try {
      const result =
        extractSongContent(
          lyrics,
          songKey
        );

      setLyrics(result.lyrics);
      setChords(result.chords);
      setNumberCode(result.numberCode);

      /*
       * Generate a basic guitar guide
       * from the chords HIMIG already
       * recognized.
       */
      const generatedTabs =
        generateBasicTabGuide(
          result.chords
        );

      setTabs(generatedTabs);
      setImported(true);
    } catch (error) {
      console.error(
        "Unable to analyze song content:",
        error
      );

      alert(
        "HIMIG could not analyze the song content. Please check the pasted text and try again."
      );
    }
  }

  async function handleSave() {
    if (
      !currentRole ||
      !canAdd(currentRole)
    ) {
      alert(
        "Your current HIMIG role does not have permission to add songs."
      );
      return;
    }

    if (!title.trim()) {
      alert("Please enter a song title.");
      return;
    }

    setSaving(true);

    try {
      const user =
        await getCurrentHimigUser();

      if (!user) {
        alert(
          "Unable to identify the current HIMIG user. Please sign in again."
        );

        setSaving(false);
        return;
      }

      const lyricsAllowed =
        canEditLyrics(currentRole);

      const musicDataAllowed =
        canGenerateMusicData(currentRole);

      let finalLyrics = lyrics;
      let finalChords = chords;
      let finalNumberCode = numberCode;
      let finalTabs = tabs;

      /*
       * IMPORTANT PHASE 6 PERMISSION CHECK
       *
       * Only roles with generateMusicData permission
       * may automatically generate chords,
       * number code, and tabs.
       *
       * This prevents a Worship Leader from receiving
       * automatically generated music data when saving.
       */
      if (
        musicDataAllowed &&
        lyrics.trim()
      ) {
        const analyzed =
          extractSongContent(
            lyrics,
            songKey
          );

        /*
         * Lyrics are saved only when the role has
         * permission to edit lyrics.
         */
        if (lyricsAllowed) {
          finalLyrics =
            analyzed.lyrics;
        }

        /*
         * Generate music data only for roles
         * explicitly allowed to do so.
         */
        if (!finalChords.trim()) {
          finalChords =
            analyzed.chords;
        }

        if (!finalNumberCode.trim()) {
          finalNumberCode =
            analyzed.numberCode;
        }

        if (!finalTabs.trim()) {
          finalTabs =
            generateBasicTabGuide(
              analyzed.chords
            );
        }
      }

      /*
       * If the current role is NOT allowed to
       * generate music data, preserve only data
       * that was already explicitly entered.
       *
       * No automatic chord / number code / tab
       * generation happens here.
       */
      if (!musicDataAllowed) {
        finalChords = "";
        finalNumberCode = "";
        finalTabs = "";
      }

      /*
       * Supabase uses UUID IDs.
       */
      const songId =
        crypto.randomUUID();

      const newSong: Song = {
        id: songId,

        title: title.trim(),

        artist:
          artist.trim() ||
          "Unknown Artist",

        key: songKey,

        language,

        category,

        bpm: bpm.trim(),

        timeSignature,

        /*
         * Only roles with lyric-edit permission
         * may save lyrics.
         */
        lyrics:
          lyricsAllowed
            ? finalLyrics
            : "",

        /*
         * Music data is only saved when the role
         * has generateMusicData permission.
         */
        chords:
          musicDataAllowed
            ? finalChords
            : "",

        numberCode:
          musicDataAllowed
            ? finalNumberCode
            : "",

        tabs:
          musicDataAllowed &&
          finalTabs.trim()
            ? finalTabs
            : "",
      };

      console.log(
        "HIMIG SONG BEING SAVED TO SUPABASE:",
        newSong
      );

      const supabase =
        createClient();

      const { error } =
        await supabase
          .from("songs")
          .insert({
            id: newSong.id,

            title: newSong.title,

            artist: newSong.artist,

            key: newSong.key,

            language: newSong.language,

            category: newSong.category,

            bpm:
              newSong.bpm ?? "",

            time_signature:
              newSong.timeSignature ?? "",

            lyrics:
              newSong.lyrics ?? "",

            chords:
              newSong.chords ?? "",

            number_code:
              newSong.numberCode ?? "",

            tabs:
              newSong.tabs ?? "",

            created_by: user.id,

            organization_id:
              user.organizationId,

            updated_at:
              new Date().toISOString(),
          });

      if (error) {
        console.error(
          "Unable to save song to Supabase:",
          error
        );

        alert(
          `Unable to save the song.\n\n${error.message}`
        );

        setSaving(false);
        return;
      }

      router.push(
        "/songs/" + newSong.id
      );
    } catch (error) {
      console.error(
        "Unable to save song:",
        error
      );

      alert(
        "Unable to save the song. Please try again."
      );

      setSaving(false);
    }
  }

  if (currentRole === null) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-neutral-400">
            Loading...
          </p>
        </div>
      </main>
    );
  }

  if (!canAdd(currentRole)) {
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
              permission to add songs.
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

  const lyricsEditable =
    canEditLyrics(currentRole);

  const chordsEditable =
    canEditChords(currentRole);

  const numberCodeEditable =
    canEditNumberCode(currentRole);

  const tabsEditable =
    canEditTabs(currentRole);

  const musicDataGenerationAllowed =
    canGenerateMusicData(currentRole);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {/* HEADER */}
      <header className="border-b border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-5xl px-5 py-6 md:px-8">
          <button
            type="button"
            onClick={() =>
              router.push("/songs")
            }
            className="text-sm font-medium text-neutral-400 transition hover:text-white"
          >
            ← Back to Song Library
          </button>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Add New Song
              </h1>

              <p className="mt-2 text-sm text-neutral-400">
                Add a song and its worship resources to HIMIG.
              </p>
            </div>

            <div className="w-fit rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2">
              <p className="text-xs text-neutral-500">
                Current Role
              </p>

              <p className="mt-1 text-sm font-semibold text-white">
                {currentRole}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="mx-auto max-w-5xl px-5 py-8 pb-16 md:px-8">
        <div className="space-y-6">
          {/* SONG INFORMATION */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div>
              <h2 className="text-xl font-bold">
                Song Information
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Basic information is required when creating a song.
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Song Title *
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Your Love Is Here"
                  className="w-full rounded-lg border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Artist
                </label>

                <input
                  type="text"
                  value={artist}
                  onChange={(event) =>
                    setArtist(
                      event.target.value
                    )
                  }
                  placeholder="e.g. HIMIG Sample"
                  className="w-full rounded-lg border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Original Key *
                </label>

                <select
                  value={songKey}
                  onChange={(event) =>
                    setSongKey(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none focus:border-neutral-400"
                >
                  <option value="C">C</option>
                  <option value="C#">C#</option>
                  <option value="Db">Db</option>
                  <option value="D">D</option>
                  <option value="D#">D#</option>
                  <option value="Eb">Eb</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                  <option value="F#">F#</option>
                  <option value="Gb">Gb</option>
                  <option value="G">G</option>
                  <option value="G#">G#</option>
                  <option value="Ab">Ab</option>
                  <option value="A">A</option>
                  <option value="A#">A#</option>
                  <option value="Bb">Bb</option>
                  <option value="B">B</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Language *
                </label>

                <select
                  value={language}
                  onChange={(event) =>
                    setLanguage(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none focus:border-neutral-400"
                >
                  <option value="English">
                    English
                  </option>

                  <option value="Tagalog">
                    Tagalog
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Category *
                </label>

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none focus:border-neutral-400"
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

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  BPM
                </label>

                <input
                  type="number"
                  min="1"
                  value={bpm}
                  onChange={(event) =>
                    setBpm(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 72"
                  className="w-full rounded-lg border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none placeholder:text-neutral-600 focus:border-neutral-400"
                />

                <p className="mt-1 text-xs text-neutral-500">
                  Optional
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Time Signature *
                </label>

                <select
                  value={timeSignature}
                  onChange={(event) =>
                    setTimeSignature(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none focus:border-neutral-400"
                >
                  <option value="4/4">4/4</option>
                  <option value="3/4">3/4</option>
                  <option value="6/8">6/8</option>
                  <option value="12/8">12/8</option>
                  <option value="2/4">2/4</option>
                  <option value="2/2">2/2</option>
                  <option value="5/4">5/4</option>
                  <option value="7/8">7/8</option>
                </select>
              </div>
            </div>
          </section>

          {/* LYRICS */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Lyrics
                </h2>

                <p className="mt-1 max-w-2xl text-sm text-neutral-500">
                  Paste the lyrics only. HIMIG can analyze recognizable chord information only when your role has music-data generation permission.
                </p>
              </div>

              {lyricsEditable ? (
                <span className="shrink-0 rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                  ✏️ Editable
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-500">
                  🔒 Read-only
                </span>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm font-medium text-neutral-300">
                Lyrics Input
              </p>

              <textarea
                value={lyrics}
                onChange={(event) => {
                  setLyrics(
                    event.target.value
                  );

                  setImported(false);
                }}
                disabled={!lyricsEditable}
                placeholder={
                  lyricsEditable
                    ? `[Intro]

Your lyrics go here...

[Verse 1]

You gave it all for me

My soul desire, my everything

[Chorus]

You are all I need`
                    : "Lyrics can only be entered or edited by Owner/Admin or Worship Leader."
                }
                rows={16}
                className={`mt-5 w-full resize-y rounded-lg border px-4 py-4 text-base leading-7 text-white outline-none ${
                  lyricsEditable
                    ? "border-neutral-700 bg-[#090909] placeholder:text-neutral-600 focus:border-neutral-400"
                    : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-600 placeholder:text-neutral-700"
                }`}
              />

              {lyricsEditable &&
                musicDataGenerationAllowed && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-neutral-500">
                      Paste lyrics with any available chord symbols. HIMIG will recognize the chords and prepare the available music data.
                    </p>

                    <button
                      type="button"
                      onClick={
                        handleAnalyzeContent
                      }
                      className="shrink-0 rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Analyze Chords
                    </button>
                  </div>
                )}

              {lyricsEditable &&
                !musicDataGenerationAllowed && (
                  <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
                    <p className="text-sm font-semibold text-white">
                      Lyrics entry available
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      Your role can add and edit lyrics, but does not have permission to generate chords, Number Code, or tabs.
                    </p>
                  </div>
                )}

              {imported && (
                <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
                  <p className="text-sm font-semibold text-white">
                    ✓ Chord analysis complete
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    HIMIG analyzed the supplied content and generated the available music data. Review and correct the generated data according to your role.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* CHORDS */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Chords
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {chordsEditable
                    ? "Recognized chords will appear here. Musicians can review and correct them."
                    : musicDataGenerationAllowed
                      ? "HIMIG can generate chord data for this song, but your role cannot manually edit it."
                      : "Your role cannot generate or edit chord data."}
                </p>
              </div>

              {chordsEditable ? (
                <span className="shrink-0 rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                  ✏️ Editable
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-500">
                  🔒 Read-only
                </span>
              )}
            </div>

            {chordsEditable && (
              <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-sm font-medium text-neutral-300">
                  Example
                </p>

                <pre className="mt-2 whitespace-pre-wrap font-mono text-sm leading-7 text-neutral-400">
{`G        D/F#       Em7       Cadd9
G        D          C         G/B
Am7      Em7        Cmaj7     Dsus4`}
                </pre>
              </div>
            )}

            <textarea
              value={chords}
              onChange={(event) =>
                setChords(
                  event.target.value
                )
              }
              disabled={!chordsEditable}
              placeholder={
                chordsEditable
                  ? `Recognized chords will appear here after analysis.

You can also manually correct the generated chords.`
                  : musicDataGenerationAllowed
                    ? "HIMIG-generated chords will appear here after analysis."
                    : "Your role does not have permission to generate or edit chord data."
              }
              rows={14}
              className={`mt-5 w-full resize-y rounded-lg border px-4 py-4 font-mono text-base leading-7 text-white outline-none ${
                chordsEditable
                  ? "border-neutral-700 bg-[#090909] placeholder:text-neutral-600 focus:border-neutral-400"
                  : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-600 placeholder:text-neutral-700"
              }`}
            />
          </section>

          {/* NUMBER CODE */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Nashville Number System
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {numberCodeEditable
                    ? "Generated from the recognized chords and original key. Musicians can review and correct it."
                    : musicDataGenerationAllowed
                      ? "HIMIG can generate Number Code for this song, but your role cannot manually edit it."
                      : "Your role cannot generate or edit Number Code."}
                </p>
              </div>

              {numberCodeEditable ? (
                <span className="shrink-0 rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                  ✏️ Editable
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-500">
                  🔒 Read-only
                </span>
              )}
            </div>

            <textarea
              value={numberCode}
              onChange={(event) =>
                setNumberCode(
                  event.target.value
                )
              }
              disabled={!numberCodeEditable}
              placeholder={
                numberCodeEditable
                  ? `1 - 5 - 6m - 4

1 - 5 - 4 - 1

5 - 6m - 4 - 5`
                  : musicDataGenerationAllowed
                    ? "HIMIG-generated Number Code will appear here after analysis."
                    : "Your role does not have permission to generate or edit Number Code."
              }
              rows={10}
              className={`mt-5 w-full resize-y rounded-lg border px-4 py-4 font-mono text-base leading-7 text-white outline-none ${
                numberCodeEditable
                  ? "border-neutral-700 bg-[#090909] placeholder:text-neutral-600 focus:border-neutral-400"
                  : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-600 placeholder:text-neutral-700"
              }`}
            />
          </section>

          {/* TABS */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Tabs & Instrument Notes
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {tabsEditable
                    ? "HIMIG prepares a basic guitar guide from the recognized chords. Musicians can review, correct, or replace it."
                    : musicDataGenerationAllowed
                      ? "HIMIG can prepare a basic guitar guide, but your role cannot edit tabs."
                      : "Your role cannot generate or edit tabs."}
                </p>
              </div>

              {tabsEditable ? (
                <span className="shrink-0 rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs text-neutral-300">
                  ✏️ Editable
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-500">
                  🔒 Read-only
                </span>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm font-medium text-neutral-300">
                HIMIG Guitar Guide
              </p>

              <p className="mt-1 text-sm leading-6 text-neutral-500">
                HIMIG creates a basic guitar chord reference from the chords already recognized in the song. This is a starting guide, not a transcription of the original recording. A Musician should review the voicings and playing pattern.
              </p>
            </div>

            <textarea
              value={tabs}
              onChange={(event) =>
                setTabs(
                  event.target.value
                )
              }
              disabled={!tabsEditable}
              placeholder={
                tabsEditable
                  ? `HIMIG guitar guide will appear here after chord analysis.

Musician review and correction are recommended.`
                  : musicDataGenerationAllowed
                    ? "HIMIG-generated guitar guide will appear here after analysis."
                    : "Your role does not have permission to generate or edit tabs."
              }
              rows={18}
              className={`mt-5 w-full resize-y rounded-lg border px-4 py-4 font-mono text-base leading-7 text-white outline-none ${
                tabsEditable
                  ? "border-neutral-700 bg-[#090909] placeholder:text-neutral-600 focus:border-neutral-400"
                  : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-600 placeholder:text-neutral-700"
              }`}
            />
          </section>

          {/* PERMISSION SUMMARY */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-lg font-semibold">
              Your Song Permissions
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              These permissions apply when creating this song.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <PermissionItem
                label="Add Songs"
                allowed={canAdd(currentRole)}
              />

              <PermissionItem
                label="Edit Lyrics"
                allowed={lyricsEditable}
              />

              <PermissionItem
                label="Generate Music Data"
                allowed={
                  musicDataGenerationAllowed
                }
              />

              <PermissionItem
                label="Edit Chords"
                allowed={chordsEditable}
              />

              <PermissionItem
                label="Edit Number Code"
                allowed={
                  numberCodeEditable
                }
              />

              <PermissionItem
                label="Edit Tabs"
                allowed={tabsEditable}
              />
            </div>
          </section>

          {/* ACTIONS */}
          <section className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() =>
                router.push("/songs")
              }
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-6 py-3 font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Song"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

function PermissionItem({
  label,
  allowed,
}: {
  label: string;
  allowed: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
      <span className="text-sm text-neutral-300">
        {label}
      </span>

      {allowed ? (
        <span className="text-sm font-medium text-neutral-200">
          ✓ Allowed
        </span>
      ) : (
        <span className="text-sm font-medium text-neutral-500">
          🔒 Restricted
        </span>
      )}
    </div>
  );
}
