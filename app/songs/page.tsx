"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  canAdd,
  canDelete,
  canEditChords,
  canEditLyrics,
  canEditNumberCode,
  canEditTabs,
  type HimigRole,
} from "@/lib/permissions";
import { getCurrentHimigUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase";
import {
  isBuiltInSong,
  type Song,
} from "@/lib/songs";

const supabase = createClient();

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("All");
  const [category, setCategory] = useState("All");
  const [currentRole, setCurrentRole] =
    useState<HimigRole>("Owner/Admin");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadSongs() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "No authenticated Supabase user found."
        );
      }

      const { data, error } = await supabase
        .from("songs")
        .select(
          'id, title, artist, "key", language, category, bpm, time_signature, lyrics, chords, number_code, tabs'
        )
        .order("title", { ascending: true });

      if (error) {
        console.error(
          "SUPABASE SONG LOAD ERROR:",
          error
        );

        throw new Error(error.message);
      }

      const mappedSongs: Song[] = (data ?? []).map(
        (row) => ({
          id: String(row.id ?? ""),
          title: String(row.title ?? ""),
          artist: String(row.artist ?? ""),
          key: String(row.key ?? ""),
          language: String(row.language ?? ""),
          category: String(row.category ?? ""),
          bpm:
            row.bpm === null ||
            row.bpm === undefined
              ? ""
              : String(row.bpm),
          timeSignature:
            row.time_signature === null ||
            row.time_signature === undefined
              ? ""
              : String(row.time_signature),
          lyrics:
            row.lyrics === null ||
            row.lyrics === undefined
              ? ""
              : String(row.lyrics),
          chords:
            row.chords === null ||
            row.chords === undefined
              ? ""
              : String(row.chords),
          numberCode:
            row.number_code === null ||
            row.number_code === undefined
              ? ""
              : String(row.number_code),
          tabs:
            row.tabs === null ||
            row.tabs === undefined
              ? ""
              : String(row.tabs),
        })
      );

      setSongs(mappedSongs);
    } catch (error) {
      console.error(
        "Unable to load songs from Supabase:",
        error
      );

      setSongs([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load songs from Supabase."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadFavorites() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Unable to get authenticated user:",
          userError
        );

        setFavorites([]);
        return;
      }

      if (!user) {
        setFavorites([]);
        return;
      }

      const {
        data,
        error: favoritesError,
      } = await supabase
        .from("favorites")
        .select("song_id")
        .eq("user_id", user.id);

      if (favoritesError) {
        console.error(
          "Unable to load favorites:",
          favoritesError
        );

        setFavorites([]);
        return;
      }

      setFavorites(
        (data ?? []).map(
          (favorite) => String(favorite.song_id)
        )
      );
    } catch (error) {
      console.error(
        "Unable to load favorites from Supabase:",
        error
      );

      setFavorites([]);
    }
  }

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSongs();
      void loadFavorites();
      void loadRole();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function toggleFavorite(songId: string) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      alert(
        `Unable to check your account: ${userError.message}`
      );
      return;
    }

    if (!user) {
      alert(
        "You must be logged in to manage favorites."
      );
      return;
    }

    const isCurrentlyFavorite =
      favorites.includes(songId);

    /* -----------------------------------------
       REMOVE FAVORITE
    ------------------------------------------ */

    if (isCurrentlyFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("song_id", songId);

      if (error) {
        console.error(
          "SUPABASE REMOVE FAVORITE ERROR:",
          error
        );

        alert(
          `Unable to remove favorite: ${error.message}`
        );

        return;
      }

      setFavorites((currentFavorites) =>
        currentFavorites.filter(
          (id) => id !== songId
        )
      );

      return;
    }

    /* -----------------------------------------
       ADD FAVORITE
    ------------------------------------------ */

    const { error } = await supabase
      .from("favorites")
      .insert({
        user_id: user.id,
        song_id: songId,
      });

    if (error) {
      console.error(
        "SUPABASE ADD FAVORITE ERROR:",
        error
      );

      alert(
        `Unable to add favorite: ${error.message}`
      );

      return;
    }

    setFavorites((currentFavorites) => [
      ...currentFavorites,
      songId,
    ]);
  }

  async function deleteSong(songId: string) {
    if (!canDelete(currentRole)) {
      alert(
        "Your current role does not have permission to delete songs."
      );
      return;
    }

    const song = songs.find(
      (item) => item.id === songId
    );

    if (!song) {
      return;
    }

    if (isBuiltInSong(songId)) {
      alert(
        "Built-in HIMIG songs cannot be deleted."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${song.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from("songs")
        .delete()
        .eq("id", songId);

      if (error) {
        console.error(
          "SUPABASE DELETE SONG ERROR:",
          error
        );

        alert(
          `Unable to delete the song: ${error.message}`
        );

        return;
      }

      setSongs((currentSongs) =>
        currentSongs.filter(
          (item) => item.id !== songId
        )
      );

      setFavorites((currentFavorites) =>
        currentFavorites.filter(
          (id) => id !== songId
        )
      );
    } catch (error) {
      console.error(
        "Unable to delete song from Supabase:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to delete the song."
      );
    }
  }

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const searchText =
        search.toLowerCase().trim();

      const matchesSearch =
        searchText === "" ||
        song.title
          .toLowerCase()
          .includes(searchText) ||
        song.artist
          .toLowerCase()
          .includes(searchText);

      const matchesLanguage =
        language === "All" ||
        song.language === language;

      const matchesCategory =
        category === "All" ||
        song.category === category;

      return (
        matchesSearch &&
        matchesLanguage &&
        matchesCategory
      );
    });
  }, [
    songs,
    search,
    language,
    category,
  ]);

  const canEditAnySongSection =
    canEditLyrics(currentRole) ||
    canEditChords(currentRole) ||
    canEditNumberCode(currentRole) ||
    canEditTabs(currentRole);

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="hidden w-64 shrink-0 border-r border-neutral-800 bg-[#090909] md:flex md:flex-col">

          {/* LOGO */}
          <div className="border-b border-neutral-800 px-6 py-6">
            <Link
              href="/"
              className="block"
            >
              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-xl text-white">
                  ♪
                </div>

                <div>
                  <h1 className="font-serif text-2xl font-semibold italic tracking-wide text-white">
                    HIMIG
                  </h1>

                  <p className="text-xs text-neutral-500">
                    Praise and Worship
                  </p>
                </div>

              </div>
            </Link>
          </div>

          {/* MENU */}
          <div className="px-4 py-5">

            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
              Menu
            </p>

            <nav className="space-y-1">

              {/* DASHBOARD */}
              <Link
                href="/"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              >
                <span className="flex w-5 justify-center text-lg">
                  ⌂
                </span>

                Dashboard
              </Link>

              {/* SONG LIBRARY */}
              <Link
                href="/songs"
                className="flex items-center gap-3 rounded-xl bg-neutral-800 px-3 py-3 text-sm font-semibold text-white"
              >
                <span className="flex w-5 justify-center text-lg">
                  ♫
                </span>

                Song Library
              </Link>

              {/* SETLISTS */}
              <Link
                href="/setlists"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              >
                <span className="flex w-5 justify-center text-lg">
                  ☰
                </span>

                Setlists
              </Link>

              {/* FAVORITES */}
              <Link
                href="/favorites"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              >
                <span className="flex w-5 justify-center text-lg">
                  ♡
                </span>

                Favorites
              </Link>

              

              {/* TEAM */}
              <Link
                href="/team"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              >
                <span className="flex w-5 justify-center text-lg">
                  ♙
                </span>

                Team
              </Link>

            </nav>
          </div>

          {/* CURRENT TEAM */}
          <div className="mt-auto border-t border-neutral-800 p-4">

            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">

              <p className="text-xs text-neutral-600">
                Current Team
              </p>

              <p className="mt-1 font-semibold text-white">
                KCCC Psalmist
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                {currentRole}
              </p>

            </div>

          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1">

          {/* MOBILE HEADER */}
          <header className="border-b border-neutral-800 bg-[#090909] md:hidden">

            <div className="flex items-center justify-between px-5 py-4">

              <Link
                href="/"
                className="flex items-center gap-3"
              >

                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 font-bold">
                  ♪
                </div>

                <div>
                  <p className="font-serif text-xl font-semibold italic">
                    HIMIG
                  </p>

                  <p className="text-[10px] text-neutral-500">
                    Praise and Worship
                  </p>
                </div>

              </Link>

              <Link
                href="/team"
                className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              >
                Team
              </Link>

            </div>

          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">

            {/* HEADER */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div>

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-xl text-neutral-300">
                    ♫
                  </div>

                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">
                      Song Library
                    </h2>

                    <p className="mt-1 text-sm text-neutral-500">
                      Browse and manage your worship songs.
                    </p>
                  </div>

                </div>

              </div>

              {canAdd(currentRole) && (
                <Link
                  href="/songs/new"
                  className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-neutral-200"
                >
                  <span>+</span>
                  Add Song
                </Link>
              )}

            </div>

            {/* CURRENT ROLE */}
            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800 text-lg text-neutral-300">
                    ♙
                  </div>

                  <div>

                    <p className="text-xs text-neutral-600">
                      Current HIMIG Role
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      {currentRole}
                    </p>

                  </div>

                </div>

                <Link
                  href="/team"
                  className="text-sm font-medium text-neutral-400 transition hover:text-white"
                >
                  Change role →
                </Link>

              </div>

            </div>

            {/* SEARCH + FILTERS */}
            <div className="mt-6 grid gap-3 md:grid-cols-3">

              <input
                type="text"
                placeholder="Search songs or artists..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white outline-none placeholder:text-neutral-600 transition focus:border-neutral-500"
              />

              <select
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value)
                }
                className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              >
                <option value="All">
                  All Languages
                </option>

                <option value="English">
                  English
                </option>

                <option value="Tagalog">
                  Tagalog
                </option>
              </select>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white outline-none transition focus:border-neutral-500"
              >
                <option value="All">
                  All Categories
                </option>

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

            {/* LOADING / ERROR */}
            {loading && (
              <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center text-sm text-neutral-500">
                Loading songs from Supabase...
              </div>
            )}

            {!loading && errorMessage && (
              <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/30 p-6 text-center">

                <p className="font-semibold text-red-300">
                  Unable to load songs
                </p>

                <p className="mt-2 text-sm text-red-400">
                  {errorMessage}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void loadSongs()
                  }
                  className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
                >
                  Try Again
                </button>

              </div>
            )}

            {/* SONG COUNT */}
            {!loading && !errorMessage && (
              <div className="mt-6 flex items-center gap-2 text-sm text-neutral-500">

                <span className="text-lg">
                  ♫
                </span>

                Showing{" "}

                <span className="font-semibold text-white">
                  {filteredSongs.length}
                </span>{" "}

                song
                {filteredSongs.length !== 1
                  ? "s"
                  : ""}

              </div>
            )}

            {/* SONG LIST */}
            {!loading && !errorMessage && (
              <div className="mt-4 space-y-4">

                {filteredSongs.length === 0 ? (

                  <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900 p-10 text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-xl text-neutral-400">
                      ♫
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-white">
                      No songs found
                    </h3>

                    <p className="mt-2 text-sm text-neutral-500">
                      Try changing your search or filters.
                    </p>

                  </div>

                ) : (

                  filteredSongs.map((song) => {

                    const isFavorite =
                      favorites.includes(song.id);

                    const isDefaultSong =
                      isBuiltInSong(song.id);

                    return (

                      <div
                        key={song.id}
                        className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600"
                      >

                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                          {/* SONG INFO */}
                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-lg text-neutral-400">
                                ♫
                              </div>

                              <h3 className="text-xl font-semibold text-white">
                                {song.title}
                              </h3>

                              {isDefaultSong && (
                                <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-400">
                                  Built-in
                                </span>
                              )}

                            </div>

                            <p className="mt-2 text-sm text-neutral-500">
                              {song.artist}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2 text-xs">

                              <span className="rounded-full bg-neutral-800 px-3 py-1 text-neutral-200">
                                Key: {song.key}
                              </span>

                              <span className="rounded-full bg-neutral-800 px-3 py-1 text-neutral-400">
                                {song.language}
                              </span>

                              <span className="rounded-full bg-neutral-800 px-3 py-1 text-neutral-400">
                                {song.category}
                              </span>

                              <span className="rounded-full bg-neutral-800 px-3 py-1 text-neutral-400">
                                {song.timeSignature || "4/4"}
                              </span>

                              {song.bpm && (
                                <span className="rounded-full bg-neutral-800 px-3 py-1 text-neutral-400">
                                  {song.bpm} BPM
                                </span>
                              )}

                            </div>

                          </div>

                          {/* ACTIONS */}
                          <div className="flex flex-wrap items-center gap-2">

                            {/* FAVORITE */}
                            <button
                              type="button"
                              onClick={() =>
                                void toggleFavorite(
                                  song.id
                                )
                              }
                              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                                isFavorite
                                  ? "border-yellow-700/60 bg-yellow-950/40 text-yellow-300 hover:bg-yellow-950/60"
                                  : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                              }`}
                            >
                              {isFavorite
                                ? "★ Favorited"
                                : "☆ Favorite"}
                            </button>

                            {/* OPEN */}
                            <Link
                              href={
                                "/songs/" +
                                song.id
                              }
                              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
                            >
                              Open Song
                            </Link>

                            {/* EDIT */}
                            {canEditAnySongSection && (
                              <Link
                                href={
                                  "/songs/edit?id=" +
                                  song.id
                                }
                                className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700 hover:text-white"
                              >
                                Edit
                              </Link>
                            )}

                            {/* DELETE */}
                            {canDelete(currentRole) &&
                              !isDefaultSong && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void deleteSong(
                                      song.id
                                    )
                                  }
                                  className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950"
                                >
                                  Delete
                                </button>
                              )}

                          </div>

                        </div>

                      </div>

                    );
                  })

                )}

              </div>
            )}

          </div>

        </main>

      </div>
    </div>
  );
}