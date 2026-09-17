"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
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

type OrganizationMemberRow = {
  user_id: string;
  role: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  created_at: string;
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
    "Full access to songs, setlists, team members, and organization settings.",
  "Worship Leader":
    "Can manage songs with lyrics-focused editing and can create, edit, and delete shared setlists.",
  Musician:
    "Can manage songs with chords, tabs, and Nashville Number Code editing and can create and edit shared setlists.",
  Viewer:
    "Read-only access to shared songs and setlists.",
};

const ROLE_PERMISSIONS: Record<HimigRole, string[]> = {
  "Owner/Admin": [
    "View songs",
    "Create songs",
    "Edit songs",
    "Delete songs",
    "View setlists",
    "Create setlists",
    "Edit setlists",
    "Delete setlists",
    "Manage team",
  ],
  "Worship Leader": [
    "View songs",
    "Create songs",
    "Edit lyrics",
    "Delete songs",
    "View setlists",
    "Create setlists",
    "Edit setlists",
    "Delete setlists",
  ],
  Musician: [
    "View songs",
    "Create songs",
    "Edit chords",
    "Edit tabs",
    "Edit Nashville Number Code",
    "Delete songs",
    "View setlists",
    "Create setlists",
    "Edit setlists",
  ],
  Viewer: [
    "View songs",
    "View setlists",
  ],
};

const ROLE_STYLES: Record<HimigRole, string> = {
  "Owner/Admin":
    "border-purple-400/30 bg-purple-500/10 text-purple-300",
  "Worship Leader":
    "border-blue-400/30 bg-blue-500/10 text-blue-300",
  Musician:
    "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
  Viewer:
    "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
};

export default function TeamPage() {
  const supabase = createClient();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<
    string | null
  >(null);
  const [currentRole, setCurrentRole] =
    useState<HimigRole>("Viewer");
  const [organizationName, setOrganizationName] =
    useState("KCCC Psalmist");

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

  const [loading, setLoading] = useState(true);

  async function loadTeam() {
    setLoading(true);

    try {
      const currentUser = await getCurrentHimigUser();

      if (!currentUser) {
        setCurrentUserId(null);
        setCurrentRole("Viewer");
        setOrganizationName("KCCC Psalmist");
        setMembers([]);
        return;
      }

      setCurrentUserId(currentUser.id);
      setCurrentRole(currentUser.role);
      setOrganizationName(currentUser.organizationName);

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("organization_members")
        .select("user_id, role, created_at")
        .eq(
          "organization_id",
          currentUser.organizationId
        )
        .order("created_at", {
          ascending: true,
        });

      if (membershipError) {
        console.error(
          "Unable to load organization members:",
          membershipError
        );
        setMembers([]);
        return;
      }

      const organizationMemberships =
        (memberships ??
          []) as OrganizationMemberRow[];

      const memberIds =
        organizationMemberships.map(
          (membership) => membership.user_id
        );

      if (memberIds.length === 0) {
        setMembers([]);
        return;
      }

      const {
        data: profiles,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select(
          "id, display_name, created_at"
        )
        .in("id", memberIds);

      if (profilesError) {
        console.error(
          "Unable to load team profiles:",
          profilesError
        );
        setMembers([]);
        return;
      }

      const profileRows =
        (profiles ?? []) as ProfileRow[];

      const profileMap = new Map(
        profileRows.map((profile) => [
          profile.id,
          profile,
        ])
      );

      let loadedMembers: TeamMember[] =
        organizationMemberships
          .map((membership) => {
            const profile = profileMap.get(
              membership.user_id
            );

            if (!profile) {
              return null;
            }

            return {
              id: profile.id,
              name:
                profile.display_name ||
                "Unnamed Member",
              email:
                profile.id === currentUser.id
                  ? currentUser.email
                  : "",
              role: membership.role as HimigRole,
              createdAt:
                membership.created_at,
            };
          })
          .filter(
            (
              member
            ): member is TeamMember =>
              member !== null
          );

      if (canManageTeam(currentUser.role)) {
        try {
          const response = await fetch(
            "/api/team/members"
          );

          if (response.ok) {
            const result =
              (await response.json()) as {
                members?: TeamMemberEmail[];
              };

            const emailMap = new Map(
              (result.members ?? []).map(
                (member) => [
                  member.id,
                  member.email,
                ]
              )
            );

            loadedMembers =
              loadedMembers.map((member) => ({
                ...member,
                email:
                  emailMap.get(member.id) ??
                  member.email,
              }));
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

  useEffect(() => {
  const timer = window.setTimeout(() => {
    void loadTeam();
  }, 0);

  return () => {
    window.clearTimeout(timer);
  };

  // This page intentionally loads the current team once
  // when it mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  async function handleCreateMember(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!canManageTeam(currentRole)) {
      setCreateMemberError(
        "You do not have permission to manage team members."
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newMemberName.trim(),
            email: newMemberEmail.trim(),
            password: newMemberPassword,
            role: newMemberRole,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setCreateMemberError(
          result.error ||
            "Unable to create this team member."
        );
        return;
      }

      if (result.member) {
        const newMember: TeamMember = {
          id: result.member.id,
          name: result.member.name,
          email: result.member.email,
          role: result.member.role as HimigRole,
          createdAt:
            new Date().toISOString(),
        };

        setMembers((currentMembers) => [
          ...currentMembers,
          newMember,
        ]);
      }

      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberPassword("");
      setNewMemberRole("Worship Leader");

      setCreateMemberMessage(
        "Team member created successfully."
      );
    } catch (error) {
      console.error(
        "Unable to create team member:",
        error
      );

      setCreateMemberError(
        "Unable to create this team member."
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

    try {
      const response = await fetch(
        "/api/team/role",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: id,
            role: newRole,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "Unable to update team member role:",
          result
        );

        alert(
          result.error ||
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
    } catch (error) {
      console.error(
        "Unable to update team member role:",
        error
      );

      alert(
        "Unable to update this team member's role."
      );
    }
  }

  async function handleDeleteMember(
    id: string,
    name: string
  ) {
    if (!canManageTeam(currentRole)) {
      alert(
        "You do not have permission to manage team members."
      );
      return;
    }

    if (id === currentUserId) {
      alert(
        "You cannot delete your own Owner/Admin account from the Team page."
      );
      return;
    }

    const member = members.find(
      (item) => item.id === id
    );

    if (!member) {
      return;
    }

    if (member.role === "Owner/Admin") {
      alert(
        "Owner/Admin accounts cannot be deleted from the Team page."
      );
      return;
    }

    const confirmed = window.confirm(
      `Remove ${name} from ${organizationName}? This will permanently delete their HIMIG account.`
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setRemoveMemberError(
          result.error ||
            "Unable to remove this team member."
        );
        return;
      }

      setMembers((currentMembers) =>
        currentMembers.filter(
          (item) => item.id !== id
        )
      );

      setRemoveMemberMessage(
        `${name} was removed from the team.`
      );
    } catch (error) {
      console.error(
        "Unable to remove team member:",
        error
      );

      setRemoveMemberError(
        "Unable to remove this team member."
      );
    } finally {
      setRemovingMemberId(null);
    }
  }

  const selectedRoleDescription =
    ROLE_DESCRIPTIONS[selectedRole];

  return (
    <div className="min-h-screen bg-[#05070a] text-white">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-white/10 bg-[#080b10] lg:block">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
            <Image
              src="/himig-icon-192.png"
              alt="REST NOTE"
              width={42}
              height={42}
              className="rounded-xl"
            />

            <div>
              <div className="text-lg font-bold tracking-wide">
                REST NOTE
              </div>
              <div className="text-xs text-zinc-500">
                HIMIG
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <span className="text-lg">
                ⌂
              </span>
              Dashboard
            </Link>

            <Link
              href="/songs"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <span className="text-lg">
                ♫
              </span>
              Song Library
            </Link>

            <Link
              href="/setlists"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <span className="text-lg">
                ☰
              </span>
              Setlists
            </Link>

            <Link
              href="/favorites"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <span className="text-lg">
                ♡
              </span>
              Favorites
            </Link>

            <Link
              href="/team"
              className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white"
            >
              <span className="text-lg">
                ♙
              </span>
              Team
            </Link>
          </nav>

          <div className="border-t border-white/10 px-5 py-5">
            <div className="mb-1 text-xs uppercase tracking-wider text-zinc-500">
              Current Team
            </div>
            <div className="truncate text-sm font-medium text-white">
              {organizationName}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {currentRole}
            </div>
          </div>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="mb-8">
            <div className="mb-2 text-sm text-cyan-400">
              {organizationName}
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Team Members
                </h1>
                <p className="mt-2 text-sm text-zinc-400">
                  Manage members and organization roles for{" "}
                  {organizationName}.
                </p>
              </div>

              <div
                className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-medium ${ROLE_STYLES[currentRole]}`}
              >
                {currentRole}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
              Loading team members...
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="border-b border-white/10 px-5 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-semibold">
                        Team
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        {members.length} member
                        {members.length === 1
                          ? ""
                          : "s"}
                      </p>
                    </div>

                    {canManageTeam(currentRole) && (
                      <div className="text-xs text-zinc-500">
                        Owner/Admin access
                      </div>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-white/10">
                  {members.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-zinc-500">
                      No team members found.
                    </div>
                  ) : (
                    members.map((member) => {
                      const isCurrentUser =
                        member.id === currentUserId;

                      const canChangeRole =
                        canManageTeam(currentRole) &&
                        !isCurrentUser &&
                        member.role !==
                          "Owner/Admin";

                      const canDelete =
                        canManageTeam(currentRole) &&
                        !isCurrentUser &&
                        member.role !==
                          "Owner/Admin";

                      return (
                        <div
                          key={member.id}
                          className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate font-medium">
                                {member.name}
                              </div>

                              {isCurrentUser && (
                                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                                  You
                                </span>
                              )}
                            </div>

                            <div className="mt-1 truncate text-xs text-zinc-500">
                              {member.email ||
                                "Email unavailable"}
                            </div>

                            <div className="mt-2">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${ROLE_STYLES[member.role]}`}
                              >
                                {member.role}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {canChangeRole ? (
                              <select
                                value={member.role}
                                onChange={(event) =>
                                  void handleMemberRoleChange(
                                    member.id,
                                    event.target
                                      .value as HimigRole
                                  )
                                }
                                className="min-h-11 rounded-xl border border-white/10 bg-[#0b0f14] px-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                                aria-label={`Change role for ${member.name}`}
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
                            ) : (
                              <span className="text-xs text-zinc-600">
                                {member.role ===
                                "Owner/Admin"
                                  ? "Protected"
                                  : "No permission"}
                              </span>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteMember(
                                    member.id,
                                    member.name
                                  )
                                }
                                disabled={
                                  removingMemberId ===
                                  member.id
                                }
                                className="min-h-11 rounded-xl border border-red-400/20 px-3 text-sm text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {removingMemberId ===
                                member.id
                                  ? "Removing..."
                                  : "Remove"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <div className="space-y-6">
                {canManageTeam(currentRole) && (
                  <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="mb-5">
                      <h2 className="font-semibold">
                        Add Team Member
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        Create a new HIMIG account for{" "}
                        {organizationName}.
                      </p>
                    </div>

                    <form
                      onSubmit={handleCreateMember}
                      className="space-y-4"
                    >
                      <div>
                        <label
                          htmlFor="member-name"
                          className="mb-2 block text-xs font-medium text-zinc-400"
                        >
                          Name
                        </label>

                        <input
                          id="member-name"
                          type="text"
                          value={newMemberName}
                          onChange={(event) =>
                            setNewMemberName(
                              event.target.value
                            )
                          }
                          required
                          className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0f14] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/40"
                          placeholder="Team member name"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="member-email"
                          className="mb-2 block text-xs font-medium text-zinc-400"
                        >
                          Email
                        </label>

                        <input
                          id="member-email"
                          type="email"
                          value={newMemberEmail}
                          onChange={(event) =>
                            setNewMemberEmail(
                              event.target.value
                            )
                          }
                          required
                          className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0f14] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/40"
                          placeholder="member@example.com"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="member-password"
                          className="mb-2 block text-xs font-medium text-zinc-400"
                        >
                          Temporary Password
                        </label>

                        <input
                          id="member-password"
                          type="password"
                          value={newMemberPassword}
                          onChange={(event) =>
                            setNewMemberPassword(
                              event.target.value
                            )
                          }
                          required
                          minLength={6}
                          className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0f14] px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/40"
                          placeholder="Create a temporary password"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="member-role"
                          className="mb-2 block text-xs font-medium text-zinc-400"
                        >
                          Role
                        </label>

                        <select
                          id="member-role"
                          value={newMemberRole}
                          onChange={(event) =>
                            setNewMemberRole(
                              event.target
                                .value as HimigRole
                            )
                          }
                          className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0f14] px-3 text-sm text-white outline-none focus:border-cyan-400/40"
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

                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="text-sm font-medium">
                          {newMemberRole}
                        </div>

                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          {
                            ROLE_DESCRIPTIONS[
                              newMemberRole
                            ]
                          }
                        </p>
                      </div>

                      {createMemberMessage && (
                        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                          {createMemberMessage}
                        </div>
                      )}

                      {createMemberError && (
                        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                          {createMemberError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={creatingMember}
                        className="min-h-11 w-full rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {creatingMember
                          ? "Creating..."
                          : "Create Team Member"}
                      </button>
                    </form>
                  </section>
                )}

                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="mb-5">
                    <h2 className="font-semibold">
                      Role Permissions
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Review what each HIMIG role can access.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label
                      htmlFor="permission-role"
                      className="mb-2 block text-xs font-medium text-zinc-400"
                    >
                      Select Role
                    </label>

                    <select
                      id="permission-role"
                      value={selectedRole}
                      onChange={(event) =>
                        setSelectedRole(
                          event.target
                            .value as HimigRole
                        )
                      }
                      className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0b0f14] px-3 text-sm text-white outline-none focus:border-cyan-400/40"
                    >
                      {ROLES.map((role) => (
                        <option
                          key={role}
                          value={role}
                        >
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    className={`rounded-xl border p-4 ${ROLE_STYLES[selectedRole]}`}
                  >
                    <div className="font-medium">
                      {selectedRole}
                    </div>

                    <p className="mt-2 text-xs leading-5 opacity-80">
                      {selectedRoleDescription}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2">
                    {ROLE_PERMISSIONS[
                      selectedRole
                    ].map((permission) => (
                      <div
                        key={permission}
                        className="flex items-start gap-2 text-xs text-zinc-400"
                      >
                        <span className="mt-0.5 text-cyan-400">
                          ✓
                        </span>
                        <span>{permission}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {removeMemberMessage && (
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                    {removeMemberMessage}
                  </div>
                )}

                {removeMemberError && (
                  <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    {removeMemberError}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}