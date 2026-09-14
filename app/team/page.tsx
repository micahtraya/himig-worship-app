"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  canManageTeam,
  type HimigRole,
} from "@/lib/permissions";
import { createClient } from "@/lib/supabase";
import { getCurrentHimigUser } from "@/lib/auth";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: HimigRole;
  createdAt: string;
};

type TeamMemberEmail = {
  id: string;
  email: string;
};

const ROLES: HimigRole[] = [
  "Owner/Admin",
  "Worship Leader",
  "Musician",
  "Viewer",
];

const MEMBER_ROLES: HimigRole[] = [
  "Worship Leader",
  "Musician",
  "Viewer",
];

const ROLE_DESCRIPTIONS: Record<HimigRole, string> = {
  "Owner/Admin":
    "Full access to songs, lyrics, music data, setlists, team members, and app settings.",

  "Worship Leader":
    "Can view, add, delete, and edit song lyrics, and prepare worship services.",

  Musician:
    "Can view, add, and delete songs and can generate and edit chords, number code, and tabs.",

  Viewer:
    "View-only access to songs and setlists.",
};

const ROLE_PERMISSIONS: Record<HimigRole, string[]> = {
  "Owner/Admin": [
    "View Songs",
    "Add Songs",
    "Delete Songs",
    "Edit Lyrics",
    "Generate Music Data",
    "Edit Chords",
    "Edit Number Code",
    "Edit Tabs",
    "Manage Team",
  ],

  "Worship Leader": [
    "View Songs",
    "Add Songs",
    "Delete Songs",
    "Edit Lyrics",
    "View Music Data",
    "Manage Setlists",
  ],

  Musician: [
    "View Songs",
    "Add Songs",
    "Delete Songs",
    "Generate Music Data",
    "Edit Chords",
    "Edit Number Code",
    "Edit Tabs",
  ],

  Viewer: [
    "View Songs",
    "View Setlists",
  ],
};

const ROLE_STYLES: Record<HimigRole, string> = {
  "Owner/Admin":
    "border-neutral-700 bg-neutral-800 text-white",

  "Worship Leader":
    "border-neutral-700 bg-neutral-800 text-white",

  Musician:
    "border-neutral-700 bg-neutral-800 text-white",

  Viewer:
    "border-neutral-700 bg-neutral-800 text-neutral-300",
};

function isValidRole(
  role: string | null
): role is HimigRole {
  return (
    role === "Owner/Admin" ||
    role === "Worship Leader" ||
    role === "Musician" ||
    role === "Viewer"
  );
}

export default function TeamPage() {
  const [members, setMembers] =
    useState<TeamMember[]>([]);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [currentRole, setCurrentRole] =
    useState<HimigRole>("Viewer");

  const [selectedRole, setSelectedRole] =
    useState<HimigRole>("Owner/Admin");

  const [newMemberName, setNewMemberName] =
    useState("");

  const [newMemberEmail, setNewMemberEmail] =
    useState("");

  const [newMemberPassword, setNewMemberPassword] =
    useState("");

  const [newMemberRole, setNewMemberRole] =
    useState<HimigRole>("Worship Leader");

  const [creatingMember, setCreatingMember] =
    useState(false);

  const [createMemberMessage, setCreateMemberMessage] =
    useState("");

  const [createMemberError, setCreateMemberError] =
    useState("");

  const [removingMemberId, setRemovingMemberId] =
    useState<string | null>(null);

  const [removeMemberMessage, setRemoveMemberMessage] =
    useState("");

  const [removeMemberError, setRemoveMemberError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadTeam() {
      const supabase = createClient();

      try {
        const currentUser =
          await getCurrentHimigUser();

        if (!currentUser) {
          setCurrentRole("Viewer");
          setCurrentUserId(null);
          setMembers([]);
          return;
        }

        setCurrentUserId(currentUser.id);
        setCurrentRole(currentUser.role);

        /*
         * Load the team profiles using the normal
         * authenticated Supabase client.
         *
         * This preserves the existing Team page
         * behavior for every HIMIG role.
         */
        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select(
            "id, display_name, role, created_at"
          )
          .order("created_at", {
            ascending: true,
          });

        if (error) {
          console.error(
            "Unable to load team members:",
            error
          );

          setMembers([]);
          return;
        }

        /*
         * Build the initial team list.
         *
         * Other members temporarily use "Team account".
         * Owner/Admin email information will be replaced
         * below using the secure server-side API.
         */
        let loadedMembers: TeamMember[] =
          (data ?? [])
            .filter(
              (member) =>
                isValidRole(member.role)
            )
            .map((member) => ({
              id: member.id,
              name:
                member.display_name ||
                "HIMIG User",
              email:
                member.id === currentUser.id
                  ? currentUser.email ||
                    "Current account"
                  : "Team account",
              role: member.role,
              createdAt: member.created_at,
            }));

        /*
         * Owner/Admin can securely retrieve the
         * actual Auth email addresses.
         *
         * The SUPABASE_SECRET_KEY remains entirely
         * on the server inside /api/team/members.
         */
        if (
          canManageTeam(currentUser.role)
        ) {
          try {
            const response = await fetch(
              "/api/team/members",
              {
                method: "GET",
                cache: "no-store",
              }
            );

            if (response.ok) {
              const result =
                await response.json();

              const emailByUserId =
                new Map<
                  string,
                  string
                >();

              const emailMembers =
                Array.isArray(
                  result.members
                )
                  ? (result.members as TeamMemberEmail[])
                  : [];

              emailMembers.forEach(
                (member) => {
                  if (
                    member.id &&
                    member.email
                  ) {
                    emailByUserId.set(
                      member.id,
                      member.email
                    );
                  }
                }
              );

              loadedMembers =
                loadedMembers.map(
                  (member) => ({
                    ...member,
                    email:
                      emailByUserId.get(
                        member.id
                      ) ||
                      member.email,
                  })
                );
            } else {
              console.error(
                "Unable to load team member emails."
              );
            }
          } catch (error) {
            console.error(
              "Unable to load team member emails:",
              error
            );
          }
        }

        setMembers(loadedMembers);
      } catch (error) {
        console.error(
          "Unable to load HIMIG team:",
          error
        );

        setMembers([]);
      } finally {
        setLoading(false);
      }
    }

    loadTeam();
  }, []);

  async function handleCreateMember(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!canManageTeam(currentRole)) {
      setCreateMemberError(
        "You do not have permission to create team accounts."
      );
      return;
    }

    setCreatingMember(true);
    setCreateMemberMessage("");
    setCreateMemberError("");

    try {
      const response = await fetch(
        "/api/team/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: newMemberName.trim(),
            email: newMemberEmail
              .trim()
              .toLowerCase(),
            password: newMemberPassword,
            role: newMemberRole,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setCreateMemberError(
          result.error ||
            "Unable to create the team member account."
        );
        return;
      }

      const createdMember: TeamMember = {
        id: result.member.id,
        name: result.member.name,
        email: result.member.email,
        role: result.member.role,
        createdAt:
          new Date().toISOString(),
      };

      setMembers((currentMembers) => [
        ...currentMembers,
        createdMember,
      ]);

      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberPassword("");
      setNewMemberRole(
        "Worship Leader"
      );

      setCreateMemberMessage(
        `${createdMember.name} has been added to the HIMIG team.`
      );
    } catch (error) {
      console.error(
        "Unable to create team member:",
        error
      );

      setCreateMemberError(
        "Unable to create the team member account."
      );
    } finally {
      setCreatingMember(false);
    }
  }

  async function handleMemberRoleChange(
    id: string,
    newRole: HimigRole
  ) {
    if (!canManageTeam(currentRole)) {
      alert(
        "You do not have permission to manage team members."
      );
      return;
    }

    if (id === currentUserId) {
      alert(
        "Your Owner/Admin role cannot be changed from the Team page."
      );
      return;
    }

    const member = members.find(
      (item) => item.id === id
    );

    if (!member) {
      return;
    }

    if (member.role === newRole) {
      return;
    }

    const confirmed = window.confirm(
      `Change ${member.name}'s role from ${member.role} to ${newRole}?`
    );

    if (!confirmed) {
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        role: newRole,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error(
        "Unable to update team member role:",
        error
      );

      alert(
        "Unable to update this team member's role."
      );

      return;
    }

    setMembers((currentMembers) =>
      currentMembers.map((item) =>
        item.id === id
          ? {
              ...item,
              role: newRole,
            }
          : item
      )
    );
  }

  async function handleDeleteMember(
    id: string
  ) {
    if (!canManageTeam(currentRole)) {
      alert(
        "You do not have permission to manage team members."
      );
      return;
    }

    if (id === currentUserId) {
      alert(
        "Your Owner/Admin account cannot be removed from the Team page."
      );
      return;
    }

    const member = members.find(
      (item) => item.id === id
    );

    if (!member) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${member.name} from the HIMIG team? This will permanently remove their HIMIG login account.`
    );

    if (!confirmed) {
      return;
    }

    setRemovingMemberId(id);
    setRemoveMemberMessage("");
    setRemoveMemberError("");

    try {
      const response = await fetch(
        "/api/team/delete",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId: id,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setRemoveMemberError(
          result.error ||
            "Unable to remove the team member."
        );
        return;
      }

      setMembers((currentMembers) =>
        currentMembers.filter(
          (item) => item.id !== id
        )
      );

      setRemoveMemberMessage(
        `${member.name} has been removed from the HIMIG team.`
      );
    } catch (error) {
      console.error(
        "Unable to remove team member:",
        error
      );

      setRemoveMemberError(
        "Unable to remove the team member."
      );
    } finally {
      setRemovingMemberId(null);
    }
  }

  const userCanManageTeam =
    canManageTeam(currentRole);

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

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 overflow-hidden">
                  <Image
    src="/icon.svg"
    alt="HIMIG"
    width={40}
    height={40}
    className="h-10 w-10"
  />
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

              <Link
                href="/"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              >
                <span className="flex w-5 justify-center text-lg">
                  ⌂
                </span>
                Dashboard
              </Link>

              <Link
                href="/songs"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              >
                <span className="flex w-5 justify-center text-lg">
                  ♫
                </span>
                Song Library
              </Link>

              <Link
                href="/setlists"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              >
                <span className="flex w-5 justify-center text-lg">
                  ☰
                </span>
                Setlists
              </Link>

              <Link
                href="/favorites"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              >
                <span className="flex w-5 justify-center text-lg">
                  ♡
                </span>
                Favorites
              </Link>

              <Link
                href="/team"
                className="flex items-center gap-3 rounded-xl bg-neutral-800 px-3 py-3 text-sm font-semibold text-white"
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

        {/* MAIN */}
        <main className="min-w-0 flex-1">

          {/* MOBILE HEADER */}
          <header className="border-b border-neutral-800 bg-[#090909] md:hidden">

            <div className="flex items-center justify-between px-5 py-4">

              <Link
                href="/"
                className="flex items-center gap-3"
              >

                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 overflow-hidden">
                  <Image
    src="/icon.svg"
    alt="HIMIG"
    width={36}
    height={36}
    className="h-9 w-9"
  />
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
                href="/"
                className="rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              >
                Home
              </Link>

            </div>

          </header>

          {/* CONTENT */}
          <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">

            {/* HEADER */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-xl text-neutral-300">
                  ♙
                </div>

                <div>

                  <h1 className="text-3xl font-bold tracking-tight">
                    Team
                  </h1>

                  <p className="mt-1 text-sm text-neutral-500">
                    Manage your KCCC Psalmist worship team.
                  </p>

                </div>

              </div>

            </div>

            {/* CURRENT ROLE */}
            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-800 text-lg text-neutral-300">
                    ♙
                  </div>

                  <div>

                    <p className="text-xs uppercase tracking-wide text-neutral-600">
                      Current HIMIG Role
                    </p>

                    <p className="mt-1 font-semibold text-white">
                      {currentRole}
                    </p>

                  </div>

                </div>

                <div className="max-w-lg text-sm leading-6 text-neutral-500">
                  Your role controls which features and
                  song content you can access in HIMIG.
                </div>

              </div>

              {/* CURRENT ROLE DETAILS */}
              <div className="mt-5">

                <div className="rounded-xl border border-neutral-800 bg-[#090909] p-5">

                  <p className="text-sm font-semibold text-white">
                    {ROLE_DESCRIPTIONS[currentRole]}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">

                    {ROLE_PERMISSIONS[currentRole].map(
                      (permission) => (
                        <span
                          key={permission}
                          className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400"
                        >
                          {permission}
                        </span>
                      )
                    )}

                  </div>

                  {currentRole === "Owner/Admin" && (
                    <p className="mt-4 text-xs leading-5 text-neutral-600">
                      Your Owner/Admin role is protected and
                      cannot be changed from this page.
                    </p>
                  )}

                </div>

              </div>

            </div>

            {/* CREATE TEAM MEMBER */}
            {userCanManageTeam && (
              <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">

                <div>

                  <h2 className="text-xl font-semibold">
                    Add Team Member
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    Create an individual HIMIG account and assign
                    their team role.
                  </p>

                </div>

                <form
                  onSubmit={handleCreateMember}
                  className="mt-6 grid gap-5 lg:grid-cols-2"
                >

                  {/* NAME */}
                  <div>

                    <label
                      htmlFor="new-member-name"
                      className="mb-2 block text-sm font-medium text-neutral-300"
                    >
                      Name
                    </label>

                    <input
                      id="new-member-name"
                      type="text"
                      value={newMemberName}
                      onChange={(event) =>
                        setNewMemberName(
                          event.target.value
                        )
                      }
                      placeholder="Team member name"
                      required
                      className="w-full rounded-xl border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none placeholder:text-neutral-700 transition focus:border-neutral-400"
                    />

                  </div>

                  {/* EMAIL */}
                  <div>

                    <label
                      htmlFor="new-member-email"
                      className="mb-2 block text-sm font-medium text-neutral-300"
                    >
                      Email
                    </label>

                    <input
                      id="new-member-email"
                      type="email"
                      value={newMemberEmail}
                      onChange={(event) =>
                        setNewMemberEmail(
                          event.target.value
                        )
                      }
                      placeholder="member@example.com"
                      autoComplete="off"
                      required
                      className="w-full rounded-xl border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none placeholder:text-neutral-700 transition focus:border-neutral-400"
                    />

                  </div>

                  {/* PASSWORD */}
                  <div>

                    <label
                      htmlFor="new-member-password"
                      className="mb-2 block text-sm font-medium text-neutral-300"
                    >
                      Temporary Password
                    </label>

                    <input
                      id="new-member-password"
                      type="password"
                      value={newMemberPassword}
                      onChange={(event) =>
                        setNewMemberPassword(
                          event.target.value
                        )
                      }
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      className="w-full rounded-xl border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none placeholder:text-neutral-700 transition focus:border-neutral-400"
                    />

                  </div>

                  {/* ROLE */}
                  <div>

                    <label
                      htmlFor="new-member-role"
                      className="mb-2 block text-sm font-medium text-neutral-300"
                    >
                      Role
                    </label>

                    <select
                      id="new-member-role"
                      value={newMemberRole}
                      onChange={(event) =>
                        setNewMemberRole(
                          event.target.value as HimigRole
                        )
                      }
                      className="w-full rounded-xl border border-neutral-700 bg-[#090909] px-4 py-3 text-white outline-none transition focus:border-neutral-400"
                    >
                      {MEMBER_ROLES.map(
                        (role) => (
                          <option
                            key={role}
                            value={role}
                          >
                            {role}
                          </option>
                        )
                      )}
                    </select>

                  </div>

                  {/* MESSAGES */}
                  {createMemberError && (
                    <div className="lg:col-span-2 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm leading-6 text-red-300">
                      {createMemberError}
                    </div>
                  )}

                  {createMemberMessage && (
                    <div className="lg:col-span-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm leading-6 text-neutral-300">
                      {createMemberMessage}
                    </div>
                  )}

                  {/* BUTTON */}
                  <div className="lg:col-span-2">

                    <button
                      type="submit"
                      disabled={creatingMember}
                      className="rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creatingMember
                        ? "Creating account..."
                        : "Create Team Member"}
                    </button>

                  </div>

                </form>

                <p className="mt-4 text-xs leading-5 text-neutral-600">
                  The account is created directly by the
                  Owner/Admin. No invitation email is required.
                  Give the team member their HIMIG email and
                  temporary password securely.
                </p>

              </div>
            )}

            {/* REMOVE MESSAGES */}
            {removeMemberError && (
              <div className="mt-6 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm leading-6 text-red-300">
                {removeMemberError}
              </div>
            )}

            {removeMemberMessage && (
              <div className="mt-6 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm leading-6 text-neutral-300">
                {removeMemberMessage}
              </div>
            )}

            {/* TEAM COUNT */}
            <div className="mt-8 flex items-center gap-2 text-sm text-neutral-500">

              <span className="text-lg">
                ♙
              </span>

              <span>
                Team Members
              </span>

              <span className="font-semibold text-white">
                {members.length}
              </span>

            </div>

            {/* MEMBERS */}
            <div className="mt-4 space-y-4">

              {loading ? (

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-10 text-center">

                  <p className="text-sm text-neutral-500">
                    Loading team members...
                  </p>

                </div>

              ) : members.length === 0 ? (

                <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900 p-10 text-center">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800 text-xl text-neutral-400">
                    ♙
                  </div>

                  <h2 className="mt-4 text-lg font-semibold">
                    No team members yet
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                    Create your first team member account
                    using the Add Team Member section above.
                  </p>

                </div>

              ) : (

                members.map((member) => (

                  <div
                    key={member.id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-700"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* MEMBER INFO */}
                      <div className="flex min-w-0 items-start gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-lg text-neutral-400">
                          ♙
                        </div>

                        <div className="min-w-0">

                          <h2 className="text-lg font-semibold text-white">
                            {member.name}
                          </h2>

                          <p className="mt-1 truncate text-sm text-neutral-500">
                            {member.email}
                          </p>

                          <div className="mt-3">

                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                                ROLE_STYLES[member.role]
                              }`}
                            >
                              {member.role}
                            </span>

                          </div>

                        </div>

                      </div>

                      {/* MEMBER ACTIONS */}
                      {userCanManageTeam &&
                        member.id !== currentUserId && (
                          <div className="flex flex-col gap-2 sm:flex-row">

                            <select
                              value={member.role}
                              onChange={(event) =>
                                handleMemberRoleChange(
                                  member.id,
                                  event.target
                                    .value as HimigRole
                                )
                              }
                              disabled={
                                removingMemberId ===
                                member.id
                              }
                              className="rounded-xl border border-neutral-700 bg-[#090909] px-4 py-2.5 text-sm text-white outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Change role for ${member.name}`}
                            >
                              {ROLES.filter(
                                (role) =>
                                  role !==
                                  "Owner/Admin"
                              ).map(
                                (item) => (
                                  <option
                                    key={item}
                                    value={item}
                                  >
                                    {item}
                                  </option>
                                )
                              )}
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteMember(
                                  member.id
                                )
                              }
                              disabled={
                                removingMemberId ===
                                member.id
                              }
                              className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {removingMemberId ===
                              member.id
                                ? "Removing..."
                                : "Remove"}
                            </button>

                          </div>
                        )}

                    </div>

                    {/* OWNER/ADMIN PROTECTION */}
                    {member.id === currentUserId &&
                      member.role ===
                        "Owner/Admin" && (
                        <div className="mt-5 rounded-xl border border-neutral-800 bg-[#090909] p-4">

                          <p className="text-xs uppercase tracking-wide text-neutral-600">
                            Account Protection
                          </p>

                          <p className="mt-2 text-sm leading-6 text-neutral-400">
                            This Owner/Admin account is the
                            current administrative account.
                            Its role cannot be changed or
                            removed from the Team page.
                          </p>

                        </div>
                      )}

                    {/* ROLE DESCRIPTION */}
                    <div className="mt-5 rounded-xl border border-neutral-800 bg-[#090909] p-4">

                      <p className="text-xs uppercase tracking-wide text-neutral-600">
                        Role Access
                      </p>

                      <p className="mt-2 text-sm leading-6 text-neutral-400">
                        {ROLE_DESCRIPTIONS[
                          member.role
                        ]}
                      </p>

                    </div>

                  </div>

                ))

              )}

            </div>

            {/* ROLE GUIDE */}
            <div className="mt-10">

              <div>

                <h2 className="text-xl font-semibold">
                  HIMIG Role Guide
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  The four roles available to your worship team.
                </p>

              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">

                {ROLES.map((item) => (

                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setSelectedRole(item)
                    }
                    className={`text-left rounded-2xl border p-5 transition ${
                      selectedRole === item
                        ? "border-neutral-600 bg-neutral-900"
                        : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
                    }`}
                  >

                    <div className="flex items-center justify-between gap-3">

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          ROLE_STYLES[item]
                        }`}
                      >
                        {item}
                      </span>

                      {selectedRole === item && (
                        <span className="text-xs text-neutral-500">
                          Selected
                        </span>
                      )}

                    </div>

                    <p className="mt-4 text-sm leading-6 text-neutral-400">
                      {ROLE_DESCRIPTIONS[item]}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">

                      {ROLE_PERMISSIONS[item].map(
                        (permission) => (
                          <span
                            key={permission}
                            className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-500"
                          >
                            {permission}
                          </span>
                        )
                      )}

                    </div>

                  </button>

                ))}

              </div>

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}



