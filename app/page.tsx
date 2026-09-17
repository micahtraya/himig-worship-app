
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HimigRole } from "../lib/permissions";
import { getCurrentHimigUser } from "../lib/auth";
import { createClient } from "../lib/supabase";

type Setlist = {
  id: string;
  name: string;
  date: string;
  notes: string;
  songIds: string[];
  createdAt: number;
};

const supabase = createClient();

export default function DashboardPage() {
  const [songCount, setSongCount] = useState(0);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [teamCount, setTeamCount] = useState(1);
  const [currentRole, setCurrentRole] =
    useState<HimigRole>("Owner/Admin");
  const [organizationName, setOrganizationName] =
    useState("KCCC Psalmist");

  useEffect(() => {
    async function loadDashboardData() {
      /*
       * CURRENT HIMIG USER
       *
       * This now provides:
       * - authenticated user ID
       * - organization ID
       * - organization name
       * - organization role
       */
      const currentUser = await getCurrentHimigUser();

      if (!currentUser) {
        console.error(
          "Unable to load current HIMIG user."
        );
        return;
      }

      const {
        id: userId,
        organizationId,
        organizationName,
        role,
      } = currentUser;

      setCurrentRole(role);
      setOrganizationName(organizationName);

      /*
       * SONG COUNT
       *
       * Supabase is the source of truth for the shared
       * Song Library.
       *
       * The organization ID explicitly scopes the query.
       */
      const { count: songsCount, error: songsError } =
        await supabase
          .from("songs")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("organization_id", organizationId);

      if (songsError) {
        console.error(
          "Unable to load song count:",
          songsError
        );
      } else {
        setSongCount(songsCount ?? 0);
      }

      /*
       * FAVORITES COUNT
       *
       * Favorites remain personal.
       * Only the logged-in user's favorites are counted.
       */
      const {
        count: favoritesCount,
        error: favoritesError,
      } = await supabase
        .from("favorites")
        .select("song_id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", userId);

      if (favoritesError) {
        console.error(
          "Unable to load favorite count:",
          favoritesError
        );
      } else {
        setFavoriteCount(favoritesCount ?? 0);
      }

      /*
       * SETLISTS
       *
       * Supabase is the source of truth for shared
       * Setlists.
       *
       * The organization ID explicitly scopes the query.
       */
      const {
        data: setlistRows,
        error: setlistsError,
      } = await supabase
        .from("setlists")
        .select(
          "id, name, service_date, description, created_at"
        )
        .eq("organization_id", organizationId)
        .order("service_date", {
          ascending: true,
          nullsFirst: false,
        });

      if (setlistsError) {
        console.error(
          "Unable to load setlists:",
          setlistsError
        );
      }

      /*
       * SETLIST SONGS
       *
       * Only load songs belonging to the setlists that
       * were already confirmed to belong to this
       * organization.
       */
      const setlistIds = (setlistRows ?? []).map(
        (setlist) => setlist.id
      );

      const songsBySetlist: Record<string, string[]> = {};

      if (setlistIds.length > 0) {
        const {
          data: setlistSongRows,
          error: setlistSongsError,
        } = await supabase
          .from("setlist_songs")
          .select("setlist_id, song_id, position")
          .in("setlist_id", setlistIds)
          .order("position", {
            ascending: true,
          });

        if (setlistSongsError) {
          console.error(
            "Unable to load setlist songs:",
            setlistSongsError
          );
        }

        for (const row of setlistSongRows ?? []) {
          if (!songsBySetlist[row.setlist_id]) {
            songsBySetlist[row.setlist_id] = [];
          }

          songsBySetlist[row.setlist_id].push(row.song_id);
        }
      }

      if (!setlistsError) {
        const mappedSetlists: Setlist[] = (
          setlistRows ?? []
        ).map((setlist) => ({
          id: setlist.id,
          name: setlist.name,
          date: setlist.service_date ?? "",
          notes: setlist.description ?? "",
          songIds: songsBySetlist[setlist.id] ?? [],
          createdAt: new Date(
            setlist.created_at
          ).getTime(),
        }));

        setSetlists(mappedSetlists);
      }

      /*
       * TEAM MEMBERS
       *
       * Team membership is now organization-aware.
       * The organization_members table is the source
       * of truth instead of localStorage.
       */
      const {
        count: membersCount,
        error: membersError,
      } = await supabase
        .from("organization_members")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("organization_id", organizationId);

      if (membersError) {
        console.error(
          "Unable to load organization member count:",
          membersError
        );
      } else {
        setTeamCount(membersCount ?? 0);
      }
    }

    window.setTimeout(() => {
      void loadDashboardData().catch((error) => {
        console.error(
          "Unable to load dashboard data:",
          error
        );
      });
    }, 0);
  }, []);

  /*
   * UPCOMING SETLISTS
   *
   * Only future/today setlists are shown.
   * All upcoming setlists are included.
   * They are ordered from the earliest service date
   * to the latest service date.
   */
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const upcomingSetlists = [...setlists]
    .filter((setlist) => {
      return setlist.date >= today.toISOString().slice(0, 10);
    })
    .sort((a, b) => {
      return a.date.localeCompare(b.date);
    });

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden w-64 shrink-0 border-r border-neutral-800 bg-[#090909] md:flex md:flex-col">
          {/* LOGO */}
          <div className="border-b border-neutral-800 px-6 py-6">
            <Link href="/" className="block">
              <div className="flex items-center gap-3">
                {/* REST NOTE LOGO */}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-[#090909]">
                  <svg
                    viewBox="0 0 64 64"
                    className="h-7 w-7"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient
                        id="himigRestGradient"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#67e8f9"
                        />
                        <stop
                          offset="55%"
                          stopColor="#22d3ee"
                        />
                        <stop
                          offset="100%"
                          stopColor="#2563eb"
                        />
                      </linearGradient>
                    </defs>

                    <path
                      d="M31 7
                         C39 13 48 19 49 27
                         C50 34 44 38 37 41
                         C31 44 29 47 33 52
                         C36 56 40 59 42 61
                         C33 58 25 54 20 49
                         C15 44 16 39 22 35
                         C27 32 31 30 30 26
                         C29 21 23 18 18 16
                         C23 14 27 11 31 7Z"
                      fill="url(#himigRestGradient)"
                    />
                  </svg>
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
                className="flex items-center gap-3 rounded-xl bg-neutral-800 px-3 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700"
              >
                <span className="flex w-5 justify-center text-lg">
                  ⌂
                </span>
                Dashboard
              </Link>

              {/* SONG LIBRARY */}
              <Link
                href="/songs"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
              >
                <span className="flex w-5 justify-center text-lg">
                  ♫
                </span>
                Song Library
              </Link>

              {/* SETLISTS */}
              <Link
                href="/setlists"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
              >
                <span className="flex w-5 justify-center text-lg">
                  ☰
                </span>
                Setlists
              </Link>

              {/* FAVORITES */}
              <Link
                href="/favorites"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
              >
                <span className="flex w-5 justify-center text-lg">
                  ♡
                </span>
                Favorites
              </Link>

              {/* TEAM */}
              <Link
                href="/team"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
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
                {organizationName}
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                {currentRole}
              </p>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="min-w-0 flex-1">
          {/* MOBILE HEADER */}
          <header className="border-b border-neutral-800 bg-[#090909] md:hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <Link
                href="/"
                className="flex items-center gap-3"
              >
                {/* MOBILE REST NOTE LOGO */}
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-[#090909]">
                  <svg
                    viewBox="0 0 64 64"
                    className="h-6 w-6"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient
                        id="himigRestGradientMobile"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#67e8f9"
                        />
                        <stop
                          offset="55%"
                          stopColor="#22d3ee"
                        />
                        <stop
                          offset="100%"
                          stopColor="#2563eb"
                        />
                      </linearGradient>
                    </defs>

                    <path
                      d="M31 7
                         C39 13 48 19 49 27
                         C50 34 44 38 37 41
                         C31 44 29 47 33 52
                         C36 56 40 59 42 61
                         C33 58 25 54 20 49
                         C15 44 16 39 22 35
                         C27 32 31 30 30 26
                         C29 21 23 18 18 16
                         C23 14 27 11 31 7Z"
                      fill="url(#himigRestGradientMobile)"
                    />
                  </svg>
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
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
              >
                Team
              </Link>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
            {/* TEAM LABEL */}
            <div className="mb-8">
              <p className="text-sm font-medium text-neutral-300">
                {organizationName}
              </p>

              <p className="mt-1 text-xs text-neutral-600">
                Praise and Worship Team
              </p>
            </div>

            {/* HERO */}
            <section className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 px-6 py-8 md:px-10 md:py-10">
              <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/[0.02] blur-3xl" />

              <div className="relative max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs font-medium text-neutral-300">
                  <span>♫</span>
                  Worship Dashboard
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Welcome to HIMIG
                </h1>

                <h2 className="mt-2 text-xl font-semibold text-neutral-300">
                  Prepare. Worship. Lead.
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400 md:text-base">
                  Your praise and worship songbook for lyrics,
                  chords, number codes, tabs, and setlists —
                  all in one place.
                </p>

                {/* BUTTONS */}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/songs"
                    className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-neutral-200 active:bg-neutral-300"
                  >
                    <span>♫</span>
                    Open Song Library
                  </Link>

                  {currentRole !== "Viewer" && (
                    <Link
                      href="/setlists"
                      className="flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-5 py-3 text-center text-sm font-semibold text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800 hover:text-white active:bg-neutral-700"
                    >
                      <span>+</span>
                      Create Setlist
                    </Link>
                  )}
                </div>
              </div>
            </section>

            {/* STATS */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* SONGS */}
              <Link
                href="/songs"
                className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600 hover:bg-neutral-800/80"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">
                    Songs
                  </span>

                  <span className="text-xl text-neutral-600 transition group-hover:text-white">
                    ♫
                  </span>
                </div>

                <p className="mt-3 text-3xl font-bold text-white">
                  {songCount}
                </p>

                <p className="mt-1 text-xs text-neutral-600">
                  In your library
                </p>
              </Link>

              {/* SETLISTS */}
              <Link
                href="/setlists"
                className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600 hover:bg-neutral-800/80"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">
                    Setlists
                  </span>

                  <span className="text-xl text-neutral-600 transition group-hover:text-white">
                    ☰
                  </span>
                </div>

                <p className="mt-3 text-3xl font-bold text-white">
                  {setlists.length}
                </p>

                <p className="mt-1 text-xs text-neutral-600">
                  Upcoming
                </p>
              </Link>

              {/* FAVORITES */}
              <Link
                href="/favorites"
                className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600 hover:bg-neutral-800/80"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">
                    Favorites
                  </span>

                  <span className="text-xl text-neutral-600 transition group-hover:text-white">
                    ♡
                  </span>
                </div>

                <p className="mt-3 text-3xl font-bold text-white">
                  {favoriteCount}
                </p>

                <p className="mt-1 text-xs text-neutral-600">
                  Your favorites
                </p>
              </Link>

              {/* TEAM MEMBERS */}
              <Link
                href="/team"
                className="group rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600 hover:bg-neutral-800/80"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">
                    Team Members
                  </span>

                  <span className="text-xl text-neutral-600 transition group-hover:text-white">
                    ♙
                  </span>
                </div>

                <p className="mt-3 text-3xl font-bold text-white">
                  {teamCount}
                </p>

                <p className="mt-1 text-xs text-neutral-600">
                  {organizationName}
                </p>
              </Link>
            </section>

            {/* UPCOMING SETLISTS */}
            <section className="mt-10">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white">
                  Upcoming Setlists
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Your upcoming worship services
                </p>
              </div>

              {upcomingSetlists.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900 p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-xl text-neutral-400">
                    ☰
                  </div>

                  <h3 className="mt-4 font-semibold text-white">
                    No Upcoming Setlists
                  </h3>

                  <p className="mt-1 text-sm text-neutral-500">
                    Create a setlist for your next worship
                    service.
                  </p>

                  {currentRole !== "Viewer" && (
                    <Link
                      href="/setlists"
                      className="mt-4 inline-flex rounded-lg px-3 py-2 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
                    >
                      Create Setlist →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingSetlists.map((setlist) => (
                    <Link
                      key={setlist.id}
                      href={"/setlists/" + setlist.id}
                      className="group block rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600 hover:bg-neutral-800/80"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-400">
                              ♪
                            </span>

                            <h3 className="font-semibold text-white">
                              {setlist.name}
                            </h3>
                          </div>

                          <p className="mt-2 text-sm text-neutral-500">
                            {new Date(
                              setlist.date
                            ).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>

                        <span className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300">
                          Published
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-neutral-800 pt-4">
                        <span className="text-xs text-neutral-600">
                          {setlist.songIds.length}{" "}
                          {setlist.songIds.length === 1
                            ? "song"
                            : "songs"}
                        </span>

                        <span className="rounded-lg px-2 py-1 text-sm font-medium text-neutral-400 transition group-hover:bg-neutral-800 group-hover:text-white">
                          Open Setlist →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
