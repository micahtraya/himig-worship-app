"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Song } from "@/lib/songs";

const supabase = createClient();

export default function FavoritesPage() {
  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>([]);

  async function loadFavorites() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFavoriteSongs([]);
      return;
    }

    const { data: favorites, error: favoritesError } =
      await supabase
        .from("favorites")
        .select("song_id")
        .eq("user_id", user.id);

    if (favoritesError) {
      console.error(
        "Failed to load favorites:",
        favoritesError.message
      );
      setFavoriteSongs([]);
      return;
    }

    if (!favorites || favorites.length === 0) {
      setFavoriteSongs([]);
      return;
    }

    const songIds = favorites.map(
      (favorite) => favorite.song_id
    );

    const { data: songs, error: songsError } =
      await supabase
        .from("songs")
        .select(
          "id, title, artist, key, language, category, bpm, time_signature, lyrics, chords, number_code, tabs"
        )
        .in("id", songIds);

    if (songsError) {
      console.error(
        "Failed to load favorite songs:",
        songsError.message
      );
      setFavoriteSongs([]);
      return;
    }

    if (!songs) {
      setFavoriteSongs([]);
      return;
    }

    const mappedSongs: Song[] = songs.map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      key: song.key,
      language: song.language,
      category: song.category,
      bpm: song.bpm ?? "",
      timeSignature: song.time_signature ?? "",
      lyrics: song.lyrics ?? "",
      chords: song.chords ?? "",
      numberCode: song.number_code ?? "",
      tabs: song.tabs ?? "",
    }));

    setFavoriteSongs(mappedSongs);
  }

  /* eslint-disable react-hooks/set-state-in-effect */
useEffect(() => {
  void loadFavorites();
}, []);
/* eslint-enable react-hooks/set-state-in-effect */

  async function removeFavorite(songId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("song_id", songId);

    if (error) {
      console.error(
        "Failed to remove favorite:",
        error.message
      );
      return;
    }

    setFavoriteSongs((currentSongs) =>
      currentSongs.filter(
        (song) => song.id !== songId
      )
    );
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="hidden w-64 shrink-0 border-r border-neutral-800 bg-[#090909] md:flex md:flex-col">

          {/* LOGO */}
          <div className="border-b border-neutral-800 px-6 py-6">
            <Link href="/" className="block">

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
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
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
                className="flex items-center gap-3 rounded-xl bg-neutral-800 px-3 py-3 text-sm font-semibold text-white"
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
                Worship Team
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
                href="/songs"
                className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              >
                Songs
              </Link>

            </div>

          </header>

          {/* PAGE */}
          <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">

            {/* HEADER */}
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-xl text-neutral-300">
                ♡
              </div>

              <div>

                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Favorites
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Your saved worship songs.
                </p>

              </div>

            </div>

            {/* FAVORITE COUNT */}
            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800 text-lg text-neutral-300">
                  ★
                </div>

                <div>

                  <p className="text-xs text-neutral-600">
                    Saved Favorites
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    {favoriteSongs.length}{" "}
                    {favoriteSongs.length === 1
                      ? "song"
                      : "songs"}
                  </p>

                </div>

              </div>

            </div>

            {/* FAVORITE SONGS */}
            <div className="mt-6">

              {favoriteSongs.length === 0 ? (

                <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900 p-10 text-center">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-xl text-neutral-400">
                    ♡
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-white">
                    No Favorite Songs Yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                    Add songs to your favorites from the Song Library.
                  </p>

                  <Link
                    href="/songs"
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
                  >
                    Browse Song Library
                  </Link>

                </div>

              ) : (

                <div className="space-y-4">

                  {favoriteSongs.map((song) => (

                    <div
                      key={song.id}
                      className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600"
                    >

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        {/* SONG INFO */}
                        <div className="min-w-0">

                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-lg text-neutral-400">
                              ♫
                            </div>

                            <Link
                              href={"/songs/" + song.id}
                              className="min-w-0"
                            >
                              <h3 className="truncate text-xl font-semibold text-white transition hover:text-neutral-300">
                                {song.title}
                              </h3>
                            </Link>

                          </div>

                          <p className="mt-2 text-sm text-neutral-500">
                            {song.artist}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">

                            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-200">
                              Key: {song.key}
                            </span>

                            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-400">
                              {song.language}
                            </span>

                            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-400">
                              {song.category}
                            </span>

                          </div>

                        </div>

                        {/* ACTIONS */}
                        <div className="flex shrink-0 flex-wrap items-center gap-2">

                          {/* OPEN */}
                          <Link
                            href={"/songs/" + song.id}
                            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
                          >
                            Open Song
                          </Link>

                          {/* REMOVE FAVORITE */}
                          <button
                            type="button"
                            onClick={() =>
                              removeFavorite(song.id)
                            }
                            className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
                            title="Remove from favorites"
                            aria-label={
                              "Remove " +
                              song.title +
                              " from favorites"
                            }
                          >
                            ★ Remove
                          </button>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </div>

        </main>

      </div>
    </div>
  );
}