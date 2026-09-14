"use client";

import { useEffect, useState } from "react";
import {
  deleteSongFromSupabase,
  getSupabaseSongs,
  saveSongToSupabase,
  type Song,
} from "@/lib/songs";
import { getCurrentHimigUser } from "@/lib/auth";

export default function SupabaseSongTestPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [message, setMessage] = useState("Loading...");
  const [testSongId, setTestSongId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSongs() {
      try {
        const user = await getCurrentHimigUser();

        if (!user) {
          setMessage("No authenticated HIMIG user found.");
          return;
        }

        const supabaseSongs = await getSupabaseSongs();

        setSongs(supabaseSongs);
        setMessage(
          `Connected successfully as ${user.displayName} (${user.role}).`
        );
      } catch (error) {
        console.error(error);

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to connect to Supabase."
        );
      }
    }

    void loadSongs();
  }, []);

  async function handleCreateTestSong() {
    try {
      setMessage("Creating test song...");

      const id = crypto.randomUUID();

      const testSong: Song = {
        id,
        title: "HIMIG Supabase Test Song",
        artist: "HIMIG Test",
        key: "G",
        language: "English",
        category: "Test",
        bpm: "100",
        timeSignature: "4/4",
        lyrics: "This is a temporary Supabase test song.",
        chords: "G - C - Em - D",
        numberCode: "1 - 4 - 6m - 5",
        tabs: "Test tab data",
      };

      const savedSong = await saveSongToSupabase(testSong);

      setTestSongId(savedSong.id);

      const updatedSongs = await getSupabaseSongs();

      setSongs(updatedSongs);
      setMessage("Test song created successfully.");
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to create test song."
      );
    }
  }

  async function handleUpdateTestSong() {
    if (!testSongId) {
      setMessage("Create the test song first.");
      return;
    }

    try {
      setMessage("Updating test song...");

      const updatedSong: Song = {
        id: testSongId,
        title: "HIMIG Supabase Test Song - UPDATED",
        artist: "HIMIG Test",
        key: "A",
        language: "English",
        category: "Test",
        bpm: "110",
        timeSignature: "4/4",
        lyrics: "Updated Supabase test lyrics.",
        chords: "A - D - F#m - E",
        numberCode: "1 - 4 - 6m - 5",
        tabs: "Updated test tab data",
      };

      await saveSongToSupabase(updatedSong);

      const updatedSongs = await getSupabaseSongs();

      setSongs(updatedSongs);
      setMessage("Test song updated successfully.");
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update test song."
      );
    }
  }

  async function handleDeleteTestSong() {
    if (!testSongId) {
      setMessage("Create the test song first.");
      return;
    }

    try {
      setMessage("Deleting test song...");

      await deleteSongFromSupabase(testSongId);

      const updatedSongs = await getSupabaseSongs();

      setSongs(updatedSongs);
      setTestSongId(null);
      setMessage("Test song deleted successfully.");
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete test song."
      );
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-3xl font-bold">
          HIMIG Supabase Song Test
        </h1>

        <p className="mb-6 text-gray-400">
          Temporary test page for the Supabase Song Library.
        </p>

        <div className="mb-6 rounded-lg border border-gray-700 bg-gray-900 p-4">
          <p className="font-medium">Connection Status</p>

          <p className="mt-2 text-sm text-gray-300">
            {message}
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCreateTestSong}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
          >
            Create Test Song
          </button>

          <button
            type="button"
            onClick={handleUpdateTestSong}
            disabled={!testSongId}
            className="rounded-lg bg-green-600 px-4 py-2 font-medium hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Update Test Song
          </button>

          <button
            type="button"
            onClick={handleDeleteTestSong}
            disabled={!testSongId}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete Test Song
          </button>
        </div>

        <section>
          <h2 className="mb-4 text-xl font-semibold">
            Songs currently in Supabase
          </h2>

          {songs.length === 0 ? (
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-6 text-gray-400">
              No songs found in Supabase yet.
            </div>
          ) : (
            <div className="space-y-3">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="rounded-lg border border-gray-700 bg-gray-900 p-4"
                >
                  <p className="font-semibold">
                    {song.title}
                  </p>

                  <p className="text-sm text-gray-400">
                    {song.artist} • Key: {song.key}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    ID: {song.id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}