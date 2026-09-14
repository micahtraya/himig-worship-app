"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  transposeNote,
  transposeChordText,
  getKeyPreference,
} from "../../../../lib/chords";

import type { Song } from "../../../../lib/songs";
import { createClient } from "../../../../lib/supabase";

type Setlist = {
  id: string;
  name: string;
  date: string;
  notes: string;
  songIds: string[];
  createdAt: number;

  // Service-specific keys
  songKeys?: Record<string, string>;
};

type PersonalSongPreference = {
  songId: string;
  preferredKey: string;
  arrangement: string;
  capo: number | null;
  notes: string;
};

/* -----------------------------------------
WORSHIP MODE
----------------------------------------- */

export default function WorshipModePage() {
  const params = useParams();
  const router = useRouter();

  const setlistId = String(params.id);

  const [setlist, setSetlist] =
    useState<Setlist | null>(null);

  const [songs, setSongs] =
    useState<Song[]>([]);

  const [personalPreferences, setPersonalPreferences] =
    useState<Record<string, PersonalSongPreference>>({});

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [activeTab, setActiveTab] = useState<
    "lyrics" | "chords" | "numberCode" | "tabs"
  >("lyrics");

  /*
  LIVE transpose amount
  relative to the saved Service Key.
  */
  const [transpose, setTranspose] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  /* -----------------------------------------
  LOAD SETLIST FROM SUPABASE
  ----------------------------------------- */

  useEffect(() => {
    const supabase = createClient();

    async function loadWorshipMode() {
      setLoading(true);

      try {
        /* -----------------------------------------
        LOAD SETLIST
        ----------------------------------------- */

        const {
          data: setlistRow,
          error: setlistError,
        } = await supabase
          .from("setlists")
          .select(
            "id, name, service_date, description, created_at"
          )
          .eq("id", setlistId)
          .maybeSingle();

        if (setlistError) {
          console.error(
            "Unable to load setlist.",
            setlistError
          );

          setSetlist(null);
          setSongs([]);
          setPersonalPreferences({});
          return;
        }

        if (!setlistRow) {
          setSetlist(null);
          setSongs([]);
          setPersonalPreferences({});
          return;
        }

        /* -----------------------------------------
        LOAD SETLIST SONG RELATIONSHIPS
        ----------------------------------------- */

        const {
          data: setlistSongRows,
          error: setlistSongsError,
        } = await supabase
          .from("setlist_songs")
          .select(
            "song_id, position, service_key"
          )
          .eq("setlist_id", setlistId)
          .order("position", {
            ascending: true,
          });

        if (setlistSongsError) {
          console.error(
            "Unable to load setlist songs.",
            setlistSongsError
          );

          setSetlist({
            id: String(setlistRow.id),
            name: setlistRow.name ?? "",
            date:
              setlistRow.service_date ?? "",
            notes:
              setlistRow.description ?? "",
            songIds: [],
            createdAt: setlistRow.created_at
              ? new Date(
                  setlistRow.created_at
                ).getTime()
              : Date.now(),
            songKeys: {},
          });

          setSongs([]);
          setPersonalPreferences({});
          return;
        }

        const normalizedSetlistSongRows =
          setlistSongRows ?? [];

        const normalizedSongIds =
          normalizedSetlistSongRows
            .map((row) => String(row.song_id))
            .filter(Boolean);

        /* -----------------------------------------
        BUILD SERVICE KEY MAP
        ----------------------------------------- */

        const songKeys: Record<
          string,
          string
        > = {};

        normalizedSetlistSongRows.forEach(
          (row) => {
            if (row.service_key) {
              songKeys[String(row.song_id)] =
                row.service_key;
            }
          }
        );

        /* -----------------------------------------
        SAVE SETLIST INTO REACT STATE
        ----------------------------------------- */

        setSetlist({
          id: String(setlistRow.id),
          name: setlistRow.name ?? "",
          date:
            setlistRow.service_date ?? "",
          notes:
            setlistRow.description ?? "",
          songIds: normalizedSongIds,
          createdAt: setlistRow.created_at
            ? new Date(
                setlistRow.created_at
              ).getTime()
            : Date.now(),
          songKeys,
        });

        /* -----------------------------------------
        EMPTY SETLIST
        ----------------------------------------- */

        if (normalizedSongIds.length === 0) {
          setSongs([]);
          setPersonalPreferences({});
          return;
        }

        /* -----------------------------------------
        LOAD SONGS FROM SUPABASE
        ----------------------------------------- */

        const {
          data: songRows,
          error: songsError,
        } = await supabase
          .from("songs")
          .select(
            "id, title, artist, key, language, category, bpm, time_signature, lyrics, chords, number_code, tabs"
          )
          .in("id", normalizedSongIds);

        if (songsError) {
          console.error(
            "Unable to load worship songs.",
            songsError
          );

          setSongs([]);
          setPersonalPreferences({});
          return;
        }

        /* -----------------------------------------
        PRESERVE SETLIST ORDER
        ----------------------------------------- */

        const songsById = new Map<
          string,
          Song
        >();

        (songRows ?? []).forEach((row) => {
          const song: Song = {
            id: String(row.id),
            title: row.title ?? "",
            artist: row.artist ?? "",
            key: row.key ?? "",
            language: row.language ?? "",
            category: row.category ?? "",
            bpm:
              row.bpm !== null &&
              row.bpm !== undefined
                ? String(row.bpm)
                : "",
            timeSignature:
              row.time_signature !== null &&
              row.time_signature !== undefined
                ? String(row.time_signature)
                : "",
            lyrics: row.lyrics ?? "",
            chords: row.chords ?? "",
            numberCode:
              row.number_code ?? "",
            tabs: row.tabs ?? "",
          };

          songsById.set(
            String(row.id),
            song
          );
        });

        const orderedSongs =
          normalizedSongIds
            .map((songId) =>
              songsById.get(songId)
            )
            .filter(
              (song): song is Song =>
                Boolean(song)
            );

        setSongs(orderedSongs);

        /*
        If the current index is outside the
        newly loaded song list, return to the
        first song.
        */
        setCurrentIndex(0);

        /* -----------------------------------------
        LOAD PERSONAL SONG PREFERENCES
        ----------------------------------------- */

        const {
          data: {
            user,
          },
        } = await supabase.auth.getUser();

        if (!user) {
          setPersonalPreferences({});
        } else {
          const {
            data: preferenceRows,
            error: preferenceError,
          } = await supabase
            .from("personal_song_preferences")
            .select(
              "song_id, preferred_key, arrangement, capo, notes"
            )
            .eq("user_id", user.id)
            .in(
              "song_id",
              normalizedSongIds
            );

          if (preferenceError) {
            console.error(
              "Unable to load personal song preferences.",
              preferenceError
            );

            setPersonalPreferences({});
          } else {
            const preferencesBySongId: Record<
              string,
              PersonalSongPreference
            > = {};

            (preferenceRows ?? []).forEach(
              (row) => {
                const songId =
                  String(row.song_id);

                preferencesBySongId[songId] = {
                  songId,
                  preferredKey:
                    row.preferred_key ?? "",
                  arrangement:
                    row.arrangement ?? "",
                  capo:
                    row.capo === null ||
                    row.capo === undefined
                      ? null
                      : Number(row.capo),
                  notes:
                    row.notes ?? "",
                };
              }
            );

            setPersonalPreferences(
              preferencesBySongId
            );
          }
        }
      } catch (error) {
        console.error(
          "Unable to load worship mode.",
          error
        );

        setSetlist(null);
        setSongs([]);
        setPersonalPreferences({});
      } finally {
        setLoading(false);
      }
    }

    void loadWorshipMode();
  }, [setlistId]);

  /* -----------------------------------------
  RESET LIVE TRANSPOSE WHEN SONG CHANGES
  ----------------------------------------- */

  useEffect(() => {
    // Reset live transpose whenever
    // the selected song changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTranspose(0);
  }, [currentIndex]);

  /* -----------------------------------------
  CURRENT SONG
  ----------------------------------------- */

  const currentSong =
    songs[currentIndex];

  /* -----------------------------------------
  PERSONAL SONG PREFERENCE
  ----------------------------------------- */

  const currentPersonalPreference =
    currentSong
      ? personalPreferences[
          String(currentSong.id)
        ]
      : undefined;

  const personalArrangement =
    currentPersonalPreference?.arrangement?.trim() ||
    "";

  /* -----------------------------------------
  SERVICE KEY

  If the setlist has a saved Service Key,
  use it.

  If not, fall back to Original Key.
  ----------------------------------------- */

  const serviceKey =
    currentSong && setlist
      ? setlist.songKeys?.[
          String(currentSong.id)
        ] || currentSong.key
      : currentSong?.key || "";

  /* -----------------------------------------
  HOW FAR IS SERVICE KEY FROM ORIGINAL KEY?

  We intentionally preserve the existing
  Worship Mode signed-distance behavior.

  Example:
    G → A = +2
    G → F = -2
  ----------------------------------------- */

  const serviceKeyDistance =
    currentSong && serviceKey
      ? getSignedKeyDistance(
          currentSong.key,
          serviceKey
        )
      : 0;

  /* -----------------------------------------
  TOTAL TRANSPOSE

  Original Key
       ↓
  Service Key
       ↓
  Live Transpose
       ↓
  Current Key
  ----------------------------------------- */

  const totalTranspose =
    serviceKeyDistance + transpose;

  /* -----------------------------------------
  CURRENT KEY
  ----------------------------------------- */

  const currentKey =
    currentSong &&
    isRecognizedKey(currentSong.key)
      ? transposeNote(
          currentSong.key,
          totalTranspose,
          getKeyPreference(serviceKey)
        )
      : serviceKey;

  /* -----------------------------------------
  DISPLAY CONTENT
  ----------------------------------------- */

  let displayedContent = "";

  if (currentSong) {
    if (activeTab === "lyrics") {
      displayedContent =
        currentSong.lyrics?.trim() ||
        "No lyrics added for this song.";
    }

    if (activeTab === "chords") {
      displayedContent =
        currentSong.chords?.trim() ||
        "No chords added for this song.";
    }

    if (activeTab === "numberCode") {
      displayedContent =
        currentSong.numberCode?.trim() ||
        "No number code added for this song.";
    }

    if (activeTab === "tabs") {
      displayedContent =
        currentSong.tabs?.trim() ||
        "No tabs or instrument notes added for this song.";
    }
  }

  /* -----------------------------------------
  TRANSPOSE CHORD CONTENT

  The actual chord processing comes from
  the tested HIMIG Chord Engine.

  lib/chords.ts handles:
    - major chords
    - minor chords
    - sharps
    - flats
    - 7ths
    - maj7
    - sus2 / sus4
    - add9
    - slash chords
    - 6 / m6
    - 6/9 / m6/9
    - extended chords
    - altered chords
    - key-aware spelling
  ----------------------------------------- */

  if (
    activeTab === "chords" &&
    currentSong?.chords
  ) {
    displayedContent =
      transposeChordText(
        currentSong.chords,
        totalTranspose,
        getKeyPreference(serviceKey)
      );
  }

  /* -----------------------------------------
  NAVIGATION
  ----------------------------------------- */

  function previousSong() {
    if (currentIndex > 0) {
      setCurrentIndex(
        (index) => index - 1
      );

      setActiveTab("lyrics");
    }
  }

  function nextSong() {
    if (
      currentIndex <
      songs.length - 1
    ) {
      setCurrentIndex(
        (index) => index + 1
      );

      setActiveTab("lyrics");
    }
  }

  function selectSong(index: number) {
    setCurrentIndex(index);
    setActiveTab("lyrics");
  }

  /* -----------------------------------------
  LIVE TRANSPOSE
  ----------------------------------------- */

  function changeTranspose(
    amount: number
  ) {
    setTranspose((value) => {
      const newValue =
        value + amount;

      if (newValue > 12) {
        return 12;
      }

      if (newValue < -12) {
        return -12;
      }

      return newValue;
    });
  }

  /* -----------------------------------------
  LOADING
  ----------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090909] text-white">
        <p className="text-sm text-neutral-500">
          Loading Worship Mode...
        </p>
      </div>
    );
  }

  /* -----------------------------------------
  SETLIST NOT FOUND
  ----------------------------------------- */

  if (!setlist) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090909] p-6 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            Setlist Not Found
          </h1>

          <p className="mt-2 text-neutral-500">
            This setlist could not be found.
          </p>

          <button
            onClick={() =>
              router.push("/setlists")
            }
            className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200"
          >
            Back to Setlists
          </button>
        </div>
      </div>
    );
  }

  /* -----------------------------------------
  EMPTY SETLIST
  ----------------------------------------- */

  if (songs.length === 0) {
    return (
      <div className="min-h-screen bg-[#090909] text-white">
        <header className="border-b border-neutral-800 px-6 py-4">
          <div className="mx-auto max-w-7xl">
            <Link
              href={`/setlists/${setlistId}`}
              className="text-sm text-neutral-500 transition hover:text-white"
            >
              ← Back to Setlist
            </Link>

            <h1 className="mt-3 text-2xl font-bold">
              {setlist.name}
            </h1>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-10">
            <h2 className="text-xl font-semibold">
              No Songs in This Setlist
            </h2>

            <p className="mt-2 text-neutral-500">
              Add songs to this setlist
              before starting Worship Mode.
            </p>

            <Link
              href={`/setlists/${setlistId}`}
              className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200"
            >
              Add Songs
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* -----------------------------------------
  MAIN WORSHIP MODE
  ----------------------------------------- */

  return (
    <div className="min-h-screen bg-[#090909] pb-28 text-white">

      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-[#090909]/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <Link
                href={`/setlists/${setlistId}`}
                className="text-sm text-neutral-500 transition hover:text-white"
              >
                ← Back to Setlist
              </Link>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold md:text-2xl">
                  {setlist.name}
                </h1>

                <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
                  Song {currentIndex + 1} of{" "}
                  {songs.length}
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                router.push(
                  `/songs/${currentSong.id}`
                )
              }
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
            >
              Open Song
            </button>

          </div>
        </div>
      </header>

      {/* SONG SELECTOR */}

      <div className="border-b border-neutral-800 bg-neutral-900">
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 md:px-6">
          <div className="flex min-w-max gap-2 py-3">

            {songs.map((song, index) => (
              <button
                key={song.id}
                onClick={() =>
                  selectSong(index)
                }
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  index === currentIndex
                    ? "bg-white text-black"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                }`}
              >
                {index + 1}. {song.title}
              </button>
            ))}

          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">

        {/* SONG INFORMATION */}

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 md:p-7">

          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

            <div>
              <p className="text-sm text-neutral-500">
                {currentSong.artist}
              </p>

              <h2 className="mt-1 text-3xl font-bold md:text-4xl">
                {currentSong.title}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">

                {/* ORIGINAL KEY */}

                <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-300">
                  Original Key:{" "}
                  {currentSong.key}
                </span>

                {/* SERVICE KEY */}

                <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-300">
                  Service Key:{" "}
                  {serviceKey}
                </span>

                {/* CURRENT KEY */}

                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-black">
                  Current Key:{" "}
                  {currentKey}
                </span>

                <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-300">
                  {currentSong.language}
                </span>

                <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-300">
                  {currentSong.category}
                </span>

              </div>

              {/* SERVICE KEY NOTICE */}

              {serviceKey !==
                currentSong.key && (
                <p className="mt-3 text-xs text-neutral-500">
                  This song is prepared in{" "}
                  <span className="font-semibold text-neutral-300">
                    {serviceKey}
                  </span>{" "}
                  for this service.
                </p>
              )}

              {/* PERSONAL ARRANGEMENT */}

              {personalArrangement && (
                <div className="mt-4 rounded-xl border border-blue-900/50 bg-blue-950/20 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      🎵
                    </span>

                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
                      My Arrangement
                    </p>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-200">
                    {personalArrangement}
                  </p>
                </div>
              )}

            </div>

            {/* TRANSPOSE */}

            <div className="rounded-xl border border-neutral-700 bg-[#090909] p-3">

              <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-neutral-500">
                Live Transpose
              </p>

              <div className="flex items-center gap-2">

                <button
                  onClick={() =>
                    changeTranspose(-1)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-xl font-bold transition hover:bg-neutral-700"
                  aria-label="Transpose down"
                >
                  −
                </button>

                <div className="flex min-w-[90px] flex-col items-center">

                  <span className="text-lg font-bold">
                    {transpose > 0
                      ? `+${transpose}`
                      : transpose}
                  </span>

                  <span className="text-xs text-neutral-600">
                    semitone
                    {Math.abs(transpose) ===
                    1
                      ? ""
                      : "s"}
                  </span>

                </div>

                <button
                  onClick={() =>
                    changeTranspose(1)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-xl font-bold transition hover:bg-neutral-700"
                  aria-label="Transpose up"
                >
                  +
                </button>

              </div>

              <button
                onClick={() =>
                  setTranspose(0)
                }
                className="mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-800 hover:text-white"
              >
                Reset
              </button>

            </div>

          </div>

        </section>

        {/* CONTENT TABS */}

        <section className="mt-6">

          <div className="flex overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900 p-1">

            <button
              onClick={() =>
                setActiveTab("lyrics")
              }
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-3 text-sm font-semibold transition ${
                activeTab === "lyrics"
                  ? "bg-white text-black"
                  : "text-neutral-500 hover:text-white"
              }`}
            >
              Lyrics
            </button>

            <button
              onClick={() =>
                setActiveTab("chords")
              }
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-3 text-sm font-semibold transition ${
                activeTab === "chords"
                  ? "bg-white text-black"
                  : "text-neutral-500 hover:text-white"
              }`}
            >
              Chords
            </button>

            <button
              onClick={() =>
                setActiveTab("numberCode")
              }
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-3 text-sm font-semibold transition ${
                activeTab === "numberCode"
                  ? "bg-white text-black"
                  : "text-neutral-500 hover:text-white"
              }`}
            >
              Number Code
            </button>

            <button
              onClick={() =>
                setActiveTab("tabs")
              }
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-3 text-sm font-semibold transition ${
                activeTab === "tabs"
                  ? "bg-white text-black"
                  : "text-neutral-500 hover:text-white"
              }`}
            >
              Tabs
            </button>

          </div>

          {/* CONTENT */}

          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 md:p-8">

            <div className="mb-5 flex items-center justify-between">

              <div>

                <h3 className="text-lg font-bold">
                  {activeTab === "lyrics" &&
                    "Lyrics"}

                  {activeTab === "chords" &&
                    "Chords"}

                  {activeTab ===
                    "numberCode" &&
                    "Nashville Number System"}

                  {activeTab === "tabs" &&
                    "Tabs & Instrument Notes"}
                </h3>

                {activeTab === "chords" &&
                  totalTranspose !== 0 && (
                    <p className="mt-1 text-xs text-neutral-500">
                      Chords transposed from{" "}
                      {currentSong.key} to{" "}
                      {currentKey}
                    </p>
                  )}

              </div>

            </div>

            <div
              className={`whitespace-pre-wrap ${
                activeTab === "chords"
                  ? "font-mono text-lg leading-loose text-white md:text-xl"
                  : activeTab === "tabs"
                  ? "font-mono text-base leading-7 text-neutral-200 md:text-lg"
                  : "text-base leading-8 text-neutral-200 md:text-lg"
              }`}
            >
              {displayedContent}
            </div>

          </div>

        </section>

      </main>

      {/* FIXED NAVIGATION */}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-800 bg-[#090909]/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">

          <button
            onClick={previousSong}
            disabled={currentIndex === 0}
            className="flex-1 rounded-xl bg-neutral-800 px-5 py-3 font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 md:max-w-xs"
          >
            ← Previous
          </button>

          <div className="hidden text-center text-sm text-neutral-500 md:block">
            {currentIndex + 1} /{" "}
            {songs.length}
          </div>

          <button
            onClick={nextSong}
            disabled={
              currentIndex ===
              songs.length - 1
            }
            className="flex-1 rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 md:max-w-xs"
          >
            Next →
          </button>

        </div>

      </div>

    </div>
  );
}

/* -----------------------------------------
SIGNED KEY DISTANCE

This preserves the behavior that Worship
Mode already had for Service Key.

Examples:
G → A = +2
G → F = -2
G → Bb = +3
Bb → G = -3
----------------------------------------- */

function getSignedKeyDistance(
  fromKey: string,
  toKey: string
): number {
  const noteIndexes: Record<string, number> = {
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

  const fromIndex =
    noteIndexes[fromKey];

  const toIndex =
    noteIndexes[toKey];

  if (
    fromIndex === undefined ||
    toIndex === undefined
  ) {
    return 0;
  }

  let distance =
    toIndex - fromIndex;

  if (distance > 6) {
    distance -= 12;
  }

  if (distance < -6) {
    distance += 12;
  }

  return distance;
}

/* -----------------------------------------
RECOGNIZED KEY CHECK
----------------------------------------- */

function isRecognizedKey(
  key: string
): boolean {
  return [
    "C",
    "C#",
    "Db",
    "D",
    "D#",
    "Eb",
    "E",
    "F",
    "F#",
    "Gb",
    "G",
    "G#",
    "Ab",
    "A",
    "A#",
    "Bb",
    "B",
  ].includes(key);
}