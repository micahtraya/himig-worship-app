"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  canAddSetlistSongs,
  canDeleteSetlist,
  canEditServiceKey,
  canRemoveSetlistSongs,
  canReorderSetlistSongs,
  type HimigRole,
} from "@/lib/permissions";

import type { Song } from "@/lib/songs";
import { createClient } from "@/lib/supabase";
import { getCurrentHimigUser } from "@/lib/auth";

const supabase = createClient();

type Setlist = {
  id: string;
  name: string;
  date: string;
  notes: string;
  songIds: string[];
  createdAt: string | number;
  songKeys?: Record<string, string>;
};

type SetlistSongRow = {
  id: string;
  setlist_id: string;
  song_id: string;
  position: number;
  service_key: string | null;
  created_at: string;
};

const KEY_OPTIONS = [
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
];

export default function SetlistDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const setlistId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";

  const [currentRole, setCurrentRole] =
    useState<HimigRole>("Owner/Admin");

  const [songs, setSongs] = useState<Song[]>([]);
  const [setlist, setSetlist] =
    useState<Setlist | null>(null);

  const [serviceKeys, setServiceKeys] =
    useState<Record<string, string>>({});

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* -----------------------------------------
  LOAD SETLIST
  ------------------------------------------ */

  useEffect(() => {
    async function loadPage() {
      if (!setlistId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const user = await getCurrentHimigUser();

        if (user) {
          setCurrentRole(user.role);
        }

        /*
         * Load the complete shared Song Library
         * from Supabase.
         */
        const {
          data: songRows,
          error: songsError,
        } = await supabase
          .from("songs")
          .select("*")
          .order("title", {
            ascending: true,
          });

        if (songsError) {
          console.error(
            "Unable to load songs from Supabase:",
            songsError
          );

          alert(
            "Unable to load the Song Library. Please try again."
          );

          setSongs([]);
        } else {
          const allSongs: Song[] =
            (songRows ?? []).map((row) => ({
              id: String(row.id),
              title: row.title ?? "",
              artist: row.artist ?? "",
              key: row.key ?? "C",
              language:
                row.language ?? "English",
              category:
                row.category ?? "Worship",
              bpm: row.bpm ?? "",
              timeSignature:
                row.time_signature ?? "",
              lyrics: row.lyrics ?? "",
              chords: row.chords ?? "",
              numberCode:
                row.number_code ?? "",
              tabs: row.tabs ?? "",
            }));

          setSongs(allSongs);
        }

        /*
         * Load the selected shared setlist.
         */
        const {
          data: setlistRow,
          error: setlistError,
        } = await supabase
          .from("setlists")
          .select(
            "id, name, service_date, description, created_by, created_at, updated_at"
          )
          .eq("id", setlistId)
          .maybeSingle();

        if (setlistError) {
          console.error(
            "Unable to load setlist:",
            setlistError
          );

          setSetlist(null);
          return;
        }

        if (!setlistRow) {
          setSetlist(null);
          return;
        }

        /*
         * Load songs belonging to this setlist.
         *
         * position controls the worship flow order.
         * service_key stores the key selected for
         * this particular service.
         */
        const {
          data: setlistSongRows,
          error: setlistSongsError,
        } = await supabase
          .from("setlist_songs")
          .select(
            "id, setlist_id, song_id, position, service_key, created_at"
          )
          .eq("setlist_id", setlistId)
          .order("position", {
            ascending: true,
          });

        if (setlistSongsError) {
          console.error(
            "Unable to load setlist songs:",
            setlistSongsError
          );

          alert(
            "The setlist loaded, but its songs could not be loaded."
          );

          setSetlist({
            id: String(setlistRow.id),
            name: setlistRow.name ?? "",
            date:
              setlistRow.service_date ?? "",
            notes:
              setlistRow.description ?? "",
            songIds: [],
            createdAt:
              setlistRow.created_at,
            songKeys: {},
          });

          setServiceKeys({});

          return;
        }

        const normalizedRows =
          (setlistSongRows ??
            []) as SetlistSongRow[];

        const normalizedSongIds =
          normalizedRows.map((row) =>
            String(row.song_id)
          );

        const initialServiceKeys: Record<
          string,
          string
        > = {};

        const loadedSongs =
          (songRows ?? []).map((row) => ({
            id: String(row.id),
            key: row.key ?? "C",
          }));

        normalizedRows.forEach((row) => {
          const songId = String(row.song_id);

          const song = loadedSongs.find(
            (item) =>
              String(item.id) === songId
          );

          initialServiceKeys[songId] =
            row.service_key ||
            song?.key ||
            "C";
        });

        const normalizedSetlist: Setlist = {
          id: String(setlistRow.id),
          name: setlistRow.name ?? "",
          date:
            setlistRow.service_date ?? "",
          notes:
            setlistRow.description ?? "",
          songIds: normalizedSongIds,
          createdAt:
            setlistRow.created_at,
          songKeys: initialServiceKeys,
        };

        setSetlist(normalizedSetlist);
        setServiceKeys(initialServiceKeys);
      } catch (error) {
        console.error(
          "Unable to load setlist:",
          error
        );

        setSetlist(null);
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [setlistId]);

  /* -----------------------------------------
  PERMISSIONS
  ------------------------------------------ */

  const userCanAdd =
    canAddSetlistSongs(currentRole);

  const userCanRemove =
    canRemoveSetlistSongs(currentRole);

  const userCanReorder =
    canReorderSetlistSongs(currentRole);

  const userCanDeleteSetlist =
    canDeleteSetlist(currentRole);

  const userCanEditServiceKey =
    canEditServiceKey(currentRole);

  /* -----------------------------------------
  SAVE SETLIST SONGS
  ------------------------------------------ */

  async function saveSetlist(
    updatedSongIds: string[],
    updatedServiceKeys?: Record<
      string,
      string
    >
  ) {
    if (!setlist) {
      return;
    }

    setSaving(true);

    try {
      const normalizedSongIds =
        updatedSongIds.map((id) =>
          String(id)
        );

      const keysToSave =
        updatedServiceKeys ??
        serviceKeys;

      /*
       * Load the existing relationship rows.
       */
      const {
        data: existingRows,
        error: existingError,
      } = await supabase
        .from("setlist_songs")
        .select(
          "id, setlist_id, song_id, position, service_key, created_at"
        )
        .eq("setlist_id", setlist.id);

      if (existingError) {
        console.error(
          "Unable to load existing setlist songs:",
          existingError
        );

        alert(
          "Unable to save the setlist. Please try again."
        );

        return;
      }

      const existing =
        (existingRows ??
          []) as SetlistSongRow[];

      /*
       * Remove songs that no longer belong
       * to this setlist.
       */
      const desiredIds = new Set(
        normalizedSongIds
      );

      const rowsToDelete =
        existing.filter(
          (row) =>
            !desiredIds.has(
              String(row.song_id)
            )
        );

      for (const row of rowsToDelete) {
        const { error } =
          await supabase
            .from("setlist_songs")
            .delete()
            .eq("id", row.id);

        if (error) {
          console.error(
            "Unable to remove song from setlist:",
            error
          );

          alert(
            "Unable to save the setlist. Please try again."
          );

          return;
        }
      }

      /*
       * Create a lookup for existing rows.
       */
      const existingBySongId =
        new Map<
          string,
          SetlistSongRow
        >();

      existing.forEach((row) => {
        existingBySongId.set(
          String(row.song_id),
          row
        );
      });

      /*
       * Insert new songs and update the
       * position/service key of existing songs.
       */
      for (
        let index = 0;
        index < normalizedSongIds.length;
        index += 1
      ) {
        const songId =
          normalizedSongIds[index];

        const position = index + 1;

        const serviceKey =
          keysToSave[songId] || "C";

        const existingRow =
          existingBySongId.get(songId);

        if (existingRow) {
          const { error } =
            await supabase
              .from("setlist_songs")
              .update({
                position,
                service_key:
                  serviceKey,
              })
              .eq("id", existingRow.id);

          if (error) {
            console.error(
              "Unable to update setlist song:",
              error
            );

            alert(
              "Unable to save the setlist. Please try again."
            );

            return;
          }
        } else {
          const { error } =
            await supabase
              .from("setlist_songs")
              .insert({
                setlist_id:
                  setlist.id,
                song_id: songId,
                position,
                service_key:
                  serviceKey,
              });

          if (error) {
            console.error(
              "Unable to add song to setlist:",
              error
            );

            alert(
              "Unable to save the setlist. Please try again."
            );

            return;
          }
        }
      }

      /*
       * Update local React state after the
       * Supabase operation succeeds.
       */
      setSetlist((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          songIds:
            normalizedSongIds,
          songKeys: keysToSave,
        };
      });

      setServiceKeys(keysToSave);
    } catch (error) {
      console.error(
        "Unable to save setlist:",
        error
      );

      alert(
        "Unable to save the setlist. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /* -----------------------------------------
  SERVICE KEY
  ------------------------------------------ */

  function changeServiceKey(
    songId: string,
    newKey: string
  ) {
    if (
      !userCanEditServiceKey ||
      !setlist
    ) {
      return;
    }

    const updatedKeys = {
      ...serviceKeys,
      [songId]: newKey,
    };

    setServiceKeys(updatedKeys);

    void saveSetlist(
      setlist.songIds,
      updatedKeys
    );
  }

  function resetServiceKey(
    song: Song
  ) {
    if (
      !userCanEditServiceKey ||
      !setlist
    ) {
      return;
    }

    const updatedKeys = {
      ...serviceKeys,
      [song.id]:
        song.key || "C",
    };

    setServiceKeys(updatedKeys);

    void saveSetlist(
      setlist.songIds,
      updatedKeys
    );
  }

  /* -----------------------------------------
  ADD SONG
  ------------------------------------------ */

  function addSong(song: Song) {
    if (
      !userCanAdd ||
      !setlist
    ) {
      return;
    }

    const songId = String(song.id);

    if (
      setlist.songIds.some(
        (id) =>
          String(id) === songId
      )
    ) {
      return;
    }

    const updatedSongIds = [
      ...setlist.songIds,
      songId,
    ];

    const updatedKeys = {
      ...serviceKeys,
      [songId]:
        song.key || "C",
    };

    setServiceKeys(updatedKeys);

    void saveSetlist(
      updatedSongIds,
      updatedKeys
    );
  }

  /* -----------------------------------------
  REMOVE SONG
  ------------------------------------------ */

  function removeSong(
    songId: string
  ) {
    if (
      !userCanRemove ||
      !setlist
    ) {
      return;
    }

    const song = songs.find(
      (item) =>
        String(item.id) ===
        String(songId)
    );

    const confirmed =
      window.confirm(
        "Remove " +
          (song?.title ||
            "this song") +
          " from this setlist?"
      );

    if (!confirmed) {
      return;
    }

    const updatedSongIds =
      setlist.songIds.filter(
        (id) =>
          String(id) !==
          String(songId)
      );

    const updatedKeys = {
      ...serviceKeys,
    };

    delete updatedKeys[
      String(songId)
    ];

    setServiceKeys(updatedKeys);

    void saveSetlist(
      updatedSongIds,
      updatedKeys
    );
  }

  /* -----------------------------------------
  MOVE SONG UP
  ------------------------------------------ */

  function moveSongUp(
    songId: string
  ) {
    if (
      !userCanReorder ||
      !setlist
    ) {
      return;
    }

    const actualIndex =
      setlist.songIds.findIndex(
        (id) =>
          String(id) ===
          String(songId)
      );

    if (actualIndex <= 0) {
      return;
    }

    const updatedSongIds = [
      ...setlist.songIds,
    ];

    const current =
      updatedSongIds[actualIndex];

    const previous =
      updatedSongIds[
        actualIndex - 1
      ];

    updatedSongIds[
      actualIndex - 1
    ] = current;

    updatedSongIds[
      actualIndex
    ] = previous;

    void saveSetlist(
      updatedSongIds
    );
  }

  /* -----------------------------------------
  MOVE SONG DOWN
  ------------------------------------------ */

  function moveSongDown(
    songId: string
  ) {
    if (
  !userCanReorder ||
  !setlist
) {
  return;
}

    const actualIndex =
      setlist.songIds.findIndex(
        (id) =>
          String(id) ===
          String(songId)
      );

    if (
      actualIndex === -1 ||
      actualIndex >=
        setlist.songIds.length - 1
    ) {
      return;
    }

    const updatedSongIds = [
      ...setlist.songIds,
    ];

    const current =
      updatedSongIds[actualIndex];

    const next =
      updatedSongIds[
        actualIndex + 1
      ];

    updatedSongIds[
      actualIndex + 1
    ] = current;

    updatedSongIds[
      actualIndex
    ] = next;

    void saveSetlist(
      updatedSongIds
    );
  }

  /* -----------------------------------------
  DELETE SETLIST
  ------------------------------------------ */

  async function deleteSetlist() {
    if (
      !userCanDeleteSetlist ||
      !setlist
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        'Delete the setlist "' +
          setlist.name +
          '"?\n\nThis cannot be undone.'
      );

    if (!confirmed) {
      return;
    }

    try {
      /*
       * Remove the relationship rows first.
       */
      const {
        error: setlistSongsError,
      } = await supabase
        .from("setlist_songs")
        .delete()
        .eq(
          "setlist_id",
          setlist.id
        );

      if (setlistSongsError) {
        console.error(
          "Unable to delete setlist songs:",
          setlistSongsError
        );

        alert(
          "Unable to delete the songs from this setlist."
        );

        return;
      }

      /*
       * Then remove the setlist itself.
       */
      const {
        error: setlistError,
      } = await supabase
        .from("setlists")
        .delete()
        .eq("id", setlist.id);

      if (setlistError) {
        console.error(
          "Unable to delete setlist:",
          setlistError
        );

        alert(
          "Unable to delete the setlist. Please try again."
        );

        return;
      }

      router.push("/setlists");
    } catch (error) {
      console.error(
        "Unable to delete setlist:",
        error
      );

      alert(
        "Unable to delete the setlist. Please try again."
      );
    }
  }

  /* -----------------------------------------
  FILTER SONGS
  ------------------------------------------ */

  const filteredSongs =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return songs.filter(
        (song) => {
          if (
            setlist?.songIds.some(
              (id) =>
                String(id) ===
                String(song.id)
            )
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return (
            song.title
              .toLowerCase()
              .includes(query) ||
            song.artist
              .toLowerCase()
              .includes(query) ||
            song.language
              .toLowerCase()
              .includes(query) ||
            song.category
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      songs,
      search,
      setlist,
    ]);

  /* -----------------------------------------
  LOADING
  ------------------------------------------ */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-sm text-neutral-400">
            Loading setlist...
          </div>
        </div>
      </main>
    );
  }

  /* -----------------------------------------
  SETLIST NOT FOUND
  ------------------------------------------ */

  if (!setlist) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
          <div className="w-full rounded-2xl border border-neutral-800 bg-[#111111] p-8 text-center">
            <h1 className="text-2xl font-semibold">
              Setlist Not Found
            </h1>

            <p className="mt-3 text-sm text-neutral-400">
              This setlist may have been deleted or
              may no longer exist.
            </p>

            <Link
              href="/setlists"
              className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
            >
              Back to Setlists
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* -----------------------------------------
  SETLIST SONGS

  IMPORTANT:
  Keep the order from songIds.
  ------------------------------------------ */

  const setlistSongs =
    setlist.songIds
      .map((songId) =>
        songs.find(
          (song) =>
            String(song.id) ===
            String(songId)
        )
      )
      .filter(
        (song): song is Song =>
          Boolean(song)
      );

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <Link
                href="/songs"
                className="inline-flex items-center text-sm text-neutral-400 transition hover:text-white"
              >
                ← Song Library
              </Link>

              <Link
                href="/setlists"
                className="inline-flex items-center text-sm text-neutral-400 transition hover:text-white"
              >
                ← Back to Setlists
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {setlist.name}
              </h1>

              <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
                {currentRole}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-400">
              <span>
                📅{" "}
                {setlist.date ||
                  "No date"}
              </span>

              <span>
                🎵{" "}
                {setlistSongs.length}{" "}
                song
                {setlistSongs.length !==
                1
                  ? "s"
                  : ""}
              </span>

              {saving && (
                <span className="text-neutral-300">
                  Saving...
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {setlistSongs.length >
              0 && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/setlists/" +
                      setlist.id +
                      "/worship"
                  )
                }
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                ▶ Start Worship Mode
              </button>
            )}

            {userCanDeleteSetlist && (
              <button
                type="button"
                onClick={() =>
                  void deleteSetlist()
                }
                className="rounded-lg border border-red-900 bg-red-950/40 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-950/70"
              >
                Delete Setlist
              </button>
            )}
          </div>
        </div>

        {/* CONTENT GRID */}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">

          {/* SETLIST */}

          <section className="space-y-6">
            <div className="rounded-2xl border border-neutral-800 bg-[#111111]">

              <div className="border-b border-neutral-800 px-6 py-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Setlist Songs
                    </h2>

                    <p className="mt-1 text-sm text-neutral-500">
                      Arrange your worship flow and
                      prepare each song&apos;s service key.
                    </p>
                  </div>

                  <span className="text-sm text-neutral-500">
                    {setlistSongs.length}{" "}
                    song
                    {setlistSongs.length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                </div>
              </div>

              {setlistSongs.length ===
              0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="text-4xl">
                    🎵
                  </div>

                  <h3 className="mt-4 text-lg font-semibold">
                    No songs yet
                  </h3>

                  <p className="mt-2 text-sm text-neutral-500">
                    Add songs from the panel on the
                    right.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-800">
                  {setlistSongs.map(
                    (song) => {
                      const actualIndex =
                        setlist.songIds.findIndex(
                          (id) =>
                            String(id) ===
                            String(song.id)
                        );

                      const originalKey =
                        song.key || "C";

                      const serviceKey =
                        serviceKeys[
                          String(song.id)
                        ] ||
                        originalKey;

                      return (
                        <div
                          key={song.id}
                          className="p-6"
                        >
                          <div className="flex flex-col gap-5">

                            {/* SONG HEADER */}

                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-sm font-semibold text-neutral-300">
                                {actualIndex +
                                  1}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold">
                                      {song.title}
                                    </h3>

                                    <p className="mt-1 text-sm text-neutral-400">
                                      {song.artist ||
                                        "Unknown Artist"}
                                    </p>
                                  </div>

                                  <Link
                                    href={
                                      "/songs/" +
                                      song.id
                                    }
                                    className="text-sm text-neutral-400 transition hover:text-white"
                                  >
                                    View Song →
                                  </Link>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <span className="rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-400">
                                    {song.language}
                                  </span>

                                  <span className="rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-400">
                                    {song.category}
                                  </span>

                                  {song.timeSignature && (
                                    <span className="rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-400">
                                      {song.timeSignature}
                                    </span>
                                  )}

                                  {song.bpm && (
                                    <span className="rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-400">
                                      {song.bpm}{" "}
                                      BPM
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* SERVICE KEY */}

                            <div className="rounded-xl border border-neutral-800 bg-[#090909] p-5">
                              <div className="flex flex-col gap-4">

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <h4 className="text-sm font-semibold">
                                      Service Key
                                    </h4>

                                    <p className="mt-1 text-xs text-neutral-500">
                                      Original:{" "}
                                      <span className="font-semibold text-neutral-300">
                                        {originalKey}
                                      </span>
                                    </p>
                                  </div>

                                  <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-center">
                                    <div className="text-[10px] uppercase tracking-wider text-neutral-600">
                                      This Service
                                    </div>

                                    <div className="mt-1 text-lg font-bold">
                                      {serviceKey}
                                    </div>
                                  </div>
                                </div>

                                {userCanEditServiceKey ? (
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <select
                                      value={
                                        serviceKey
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        changeServiceKey(
                                          String(
                                            song.id
                                          ),
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-neutral-500 sm:max-w-xs"
                                    >
                                      {!KEY_OPTIONS.includes(
                                        serviceKey
                                      ) && (
                                        <option
                                          value={
                                            serviceKey
                                          }
                                        >
                                          {
                                            serviceKey
                                          }
                                        </option>
                                      )}

                                      {KEY_OPTIONS.map(
                                        (
                                          key
                                        ) => (
                                          <option
                                            key={
                                              key
                                            }
                                            value={
                                              key
                                            }
                                          >
                                            {
                                              key
                                            }
                                          </option>
                                        )
                                      )}
                                    </select>

                                    {serviceKey !==
                                      originalKey && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          resetServiceKey(
                                            song
                                          )
                                        }
                                        className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                                      >
                                        Reset to Original
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-neutral-500">
                                    Your current role cannot
                                    change the service key.
                                  </p>
                                )}

                                {serviceKey !==
                                  originalKey && (
                                  <p className="text-xs text-neutral-500">
                                    This service will use{" "}
                                    <span className="font-semibold text-neutral-300">
                                      {serviceKey}
                                    </span>{" "}
                                    instead of the original{" "}
                                    <span className="font-semibold text-neutral-300">
                                      {originalKey}
                                    </span>
                                    .
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* SONG CONTROLS */}

                            <div className="flex flex-wrap gap-2">

                              {userCanReorder && (
                                <>
                                  <button
                                    type="button"
                                    disabled={
                                      actualIndex <=
                                      0
                                    }
                                    onClick={() =>
                                      moveSongUp(
                                        String(
                                          song.id
                                        )
                                      )
                                    }
                                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-30"
                                  >
                                    ↑ Move Up
                                  </button>

                                  <button
                                    type="button"
                                    disabled={
                                      actualIndex ===
                                        -1 ||
                                      actualIndex >=
                                        setlist.songIds
                                          .length -
                                          1
                                    }
                                    onClick={() =>
                                      moveSongDown(
                                        String(
                                          song.id
                                        )
                                      )
                                    }
                                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-30"
                                  >
                                    ↓ Move Down
                                  </button>
                                </>
                              )}

                              {userCanRemove && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeSong(
                                      String(
                                        song.id
                                      )
                                    )
                                  }
                                  className="rounded-lg border border-red-950 bg-red-950/20 px-3 py-2 text-xs text-red-400 transition hover:bg-red-950/50"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {/* NOTES */}

            <div className="rounded-2xl border border-neutral-800 bg-[#111111] p-6">
              <h2 className="text-lg font-semibold">
                Setlist Notes
              </h2>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-400">
                {setlist.notes ||
                  "No notes have been added to this setlist."}
              </p>
            </div>
          </section>

          {/* ADD SONGS */}

          <aside>
            <div className="rounded-2xl border border-neutral-800 bg-[#111111]">

              <div className="border-b border-neutral-800 p-5">
                <h2 className="text-lg font-semibold">
                  Add Songs
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Add songs from your song library.
                </p>

                <div className="mt-4">
                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search songs..."
                    disabled={!userCanAdd}
                    className="w-full rounded-lg border border-neutral-800 bg-[#090909] px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {!userCanAdd ? (
                <div className="p-6">
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 text-center">
                    <p className="text-sm font-medium text-neutral-300">
                      Add Song Restricted
                    </p>

                    <p className="mt-2 text-xs leading-5 text-neutral-500">
                      Your current role cannot add
                      songs to a setlist.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="max-h-[620px] overflow-y-auto">
                    {filteredSongs.length ===
                    0 ? (
                      <div className="p-6 text-center">
                        <p className="text-sm text-neutral-400">
                          No songs found.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-neutral-800">
                        {filteredSongs.map(
                          (song) => (
                            <button
                              key={song.id}
                              type="button"
                              onClick={() =>
                                addSong(
                                  song
                                )
                              }
                              className="w-full px-5 py-4 text-left transition hover:bg-neutral-900"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-white">
                                    {
                                      song.title
                                    }
                                  </div>

                                  <div className="mt-1 truncate text-xs text-neutral-500">
                                    {song.artist ||
                                      "Unknown Artist"}
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span className="rounded border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] text-neutral-500">
                                      {
                                        song.language
                                      }
                                    </span>

                                    <span className="rounded border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] text-neutral-500">
                                      {
                                        song.category
                                      }
                                    </span>
                                  </div>
                                </div>

                                <span className="shrink-0 text-lg text-neutral-500">
                                  +
                                </span>
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-neutral-800 p-5">
                    <Link
                      href="/songs/new"
                      className="flex w-full items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:bg-neutral-800 hover:text-white"
                    >
                      + Create New Song
                    </Link>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}