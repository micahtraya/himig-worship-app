"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  canCreateSetlist,
  canDeleteSetlist,
  type HimigRole,
} from "@/lib/permissions";
import { getCurrentHimigUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase";

type Setlist = {
  id: string;
  name: string;
  date: string;
  notes: string;
  songIds: string[];
  createdAt: string;
};

export default function SetlistsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentRole, setCurrentRole] =
    useState<HimigRole>("Owner/Admin");

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [organizationId, setOrganizationId] =
    useState<string | null>(null);

  const [organizationName, setOrganizationName] =
    useState("KCCC Psalmist");

  const [setlists, setSetlists] =
    useState<Setlist[]>([]);

  const [showCreate, setShowCreate] =
    useState(false);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  useEffect(() => {
    async function initializePage() {
      setLoading(true);

      try {
        const user = await getCurrentHimigUser();

        if (!user) {
          setLoading(false);
          return;
        }

        setCurrentRole(user.role);
        setCurrentUserId(user.id);
        setOrganizationId(user.organizationId);
        setOrganizationName(user.organizationName);

        const {
          data: setlistData,
          error: setlistError,
        } = await supabase
          .from("setlists")
          .select(
            "id, name, service_date, description, created_by, created_at, updated_at"
          )
          .eq("organization_id", user.organizationId)
          .order("created_at", {
            ascending: false,
          });

        if (setlistError) {
          console.error(
            "Unable to load setlists:",
            setlistError
          );

          alert(
            "Unable to load setlists. Please try again."
          );

          return;
        }

        const setlistIds = (setlistData ?? []).map(
          (setlist) => setlist.id
        );

        let setlistSongData: {
          id: string;
          setlist_id: string;
          song_id: string;
          position: number;
          created_at: string;
        }[] = [];

        if (setlistIds.length > 0) {
          const {
            data,
            error: setlistSongError,
          } = await supabase
            .from("setlist_songs")
            .select(
              "id, setlist_id, song_id, position, created_at"
            )
            .in("setlist_id", setlistIds)
            .order("position", {
              ascending: true,
            });

          if (setlistSongError) {
            console.error(
              "Unable to load setlist songs:",
              setlistSongError
            );

            alert(
              "Setlists loaded, but their songs could not be loaded."
            );

            return;
          }

          setlistSongData = data ?? [];
        }

        const songsBySetlist: Record<
          string,
          {
            song_id: string;
            position: number;
          }[]
        > = {};

        for (const item of setlistSongData) {
          if (!songsBySetlist[item.setlist_id]) {
            songsBySetlist[item.setlist_id] = [];
          }

          songsBySetlist[item.setlist_id].push({
            song_id: item.song_id,
            position: item.position,
          });
        }

        const normalizedSetlists: Setlist[] =
          (setlistData ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            date: item.service_date ?? "",
            notes: item.description ?? "",
            songIds: (
              songsBySetlist[item.id] ?? []
            )
              .sort(
                (a, b) =>
                  a.position - b.position
              )
              .map(
                (song) => song.song_id
              ),
            createdAt: item.created_at,
          }));

        setSetlists(normalizedSetlists);
      } catch (error) {
        console.error(
          "Unexpected error loading setlists:",
          error
        );

        alert(
          "Unable to load setlists. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    void initializePage();

    // This page intentionally initializes once when mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createSetlist() {
    if (!canCreateSetlist(currentRole)) {
      alert(
        "You do not have permission to create a setlist."
      );
      return;
    }

    if (!name.trim()) {
      alert("Please enter a setlist name.");
      return;
    }

    if (!currentUserId) {
      alert(
        "Unable to identify the current user. Please sign in again."
      );
      return;
    }

    if (!organizationId) {
      alert(
        "Unable to identify your organization. Please sign in again."
      );
      return;
    }

    setCreating(true);

    try {
      const { data, error } =
        await supabase
          .from("setlists")
          .insert({
            name: name.trim(),
            service_date: date || null,
            description: notes.trim(),
            created_by: currentUserId,
            organization_id: organizationId,
          })
          .select(
            "id, name, service_date, description, created_by, created_at, updated_at"
          )
          .single();

      if (error) {
        console.error(
          "Unable to create setlist:",
          error
        );

        alert(
          "Unable to create the setlist. Please try again."
        );

        return;
      }

      const newSetlist: Setlist = {
        id: data.id,
        name: data.name,
        date: data.service_date ?? "",
        notes: data.description ?? "",
        songIds: [],
        createdAt: data.created_at,
      };

      setSetlists((current) => [
        newSetlist,
        ...current,
      ]);

      setName("");
      setDate("");
      setNotes("");
      setShowCreate(false);

      router.push(
        "/setlists/" + newSetlist.id
      );
    } catch (error) {
      console.error(
        "Unexpected error creating setlist:",
        error
      );

      alert(
        "Unable to create the setlist. Please try again."
      );
    } finally {
      setCreating(false);
    }
  }

  async function deleteSetlist(id: string) {
    if (!canDeleteSetlist(currentRole)) {
      alert(
        "You do not have permission to delete setlists."
      );
      return;
    }

    if (!organizationId) {
      alert(
        "Unable to identify your organization. Please sign in again."
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this setlist?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const {
        error: setlistSongsError,
      } = await supabase
        .from("setlist_songs")
        .delete()
        .eq("setlist_id", id);

      if (setlistSongsError) {
        console.error(
          "Unable to remove setlist songs:",
          setlistSongsError
        );

        alert(
          "Unable to delete the songs from this setlist."
        );

        return;
      }

      const { error: setlistError } =
        await supabase
          .from("setlists")
          .delete()
          .eq("id", id)
          .eq(
            "organization_id",
            organizationId
          );

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

      setSetlists((current) =>
        current.filter(
          (setlist) =>
            setlist.id !== id
        )
      );
    } catch (error) {
      console.error(
        "Unexpected error deleting setlist:",
        error
      );

      alert(
        "Unable to delete the setlist. Please try again."
      );
    }
  }

  function formatDate(
    dateString: string
  ) {
    if (!dateString) {
      return "No date";
    }

    try {
      return new Date(
        dateString
      ).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/songs"
            className="inline-flex items-center rounded-xl border border-neutral-800 bg-[#111111] px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 hover:text-white"
          >
            ← Song Library
          </Link>

          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-neutral-800 bg-[#111111] px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 hover:text-white"
          >
            Dashboard
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Setlists
            </h1>

            <p className="mt-2 text-sm text-neutral-400">
              Create and manage your worship service setlists.
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              Team: {organizationName}
            </p>
          </div>

          {canCreateSetlist(currentRole) && (
            <button
              type="button"
              onClick={() =>
                setShowCreate(true)
              }
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
            >
              + Create Setlist
            </button>
          )}

        </div>

        {showCreate && (
          <div className="mb-8 rounded-2xl border border-neutral-800 bg-[#111111] p-6">

            <div className="mb-6">

              <h2 className="text-xl font-semibold">
                Create New Setlist
              </h2>

              <p className="mt-1 text-sm text-neutral-400">
                Create a setlist for your worship service.
              </p>

            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Setlist Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Sunday Worship Service"
                  className="w-full rounded-xl border border-neutral-800 bg-[#090909] px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Service Date
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-[#090909] px-4 py-3 text-sm text-white outline-none focus:border-neutral-500"
                />
              </div>

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Notes
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Optional notes for the worship team..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-neutral-800 bg-[#090909] px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500"
                />

              </div>

            </div>

            <div className="mt-6 flex flex-wrap gap-3">

              <button
                type="button"
                onClick={() =>
                  void createSetlist()
                }
                disabled={creating}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "Create Setlist"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setName("");
                  setDate("");
                  setNotes("");
                }}
                disabled={creating}
                className="rounded-xl bg-neutral-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

            </div>

          </div>
        )}

        {loading ? (

          <div className="rounded-2xl border border-neutral-800 bg-[#0b0b0b] px-6 py-16 text-center">

            <p className="text-sm text-neutral-400">
              Loading setlists...
            </p>

          </div>

        ) : setlists.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-neutral-800 bg-[#0b0b0b] px-6 py-16 text-center">

            <div className="mx-auto max-w-md">

              <h2 className="text-xl font-semibold">
                No setlists yet
              </h2>

              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Create your first worship setlist and start
                adding songs for your service.
              </p>

              {canCreateSetlist(currentRole) && (
                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(true)
                  }
                  className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200"
                >
                  Create Your First Setlist
                </button>
              )}

            </div>

          </div>

        ) : (

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

            {setlists.map((setlist) => (

              <div
                key={setlist.id}
                className="group rounded-2xl border border-neutral-800 bg-[#111111] p-5 transition hover:border-neutral-700"
              >

                <div className="flex items-start justify-between gap-4">

                  <div className="min-w-0">

                    <h2 className="truncate text-lg font-semibold">
                      {setlist.name}
                    </h2>

                    <p className="mt-2 text-sm text-neutral-400">
                      {formatDate(setlist.date)}
                    </p>

                  </div>

                  <div className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400">
                    {setlist.songIds.length}{" "}
                    {setlist.songIds.length === 1
                      ? "song"
                      : "songs"}
                  </div>

                </div>

                {setlist.notes && (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-400">
                    {setlist.notes}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-2">

                  <Link
                    href={
                      "/setlists/" +
                      setlist.id
                    }
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
                  >
                    Open Setlist
                  </Link>

                  {canDeleteSetlist(currentRole) && (
                    <button
                      type="button"
                      onClick={() =>
                        void deleteSetlist(
                          setlist.id
                        )
                      }
                      className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-950"
                    >
                      Delete
                    </button>
                  )}

                </div>

              </div>

            ))}

          </div>

        )}

      </div>
    </div>
  );
}