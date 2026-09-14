export type HimigRole =
  | "Owner/Admin"
  | "Worship Leader"
  | "Musician"
  | "Viewer";

export type HimigPermission =
  // Song permissions
  | "view"
  | "add"
  | "delete"
  | "editLyrics"
  | "generateMusicData"
  | "editChords"
  | "editNumberCode"
  | "editTabs"
  | "manageTeam"

  // Setlist permissions
  | "createSetlist"
  | "editSetlist"
  | "addSetlistSongs"
  | "reorderSetlistSongs"
  | "removeSetlistSongs"
  | "deleteSetlist"
  | "editServiceKey";

const permissions: Record<
  HimigRole,
  Record<HimigPermission, boolean>
> = {
  "Owner/Admin": {
    // Song permissions
    view: true,
    add: true,
    delete: true,
    editLyrics: true,
    generateMusicData: true,
    editChords: true,
    editNumberCode: true,
    editTabs: true,
    manageTeam: true,

    // Setlist permissions
    createSetlist: true,
    editSetlist: true,
    addSetlistSongs: true,
    reorderSetlistSongs: true,
    removeSetlistSongs: true,
    deleteSetlist: true,
    editServiceKey: true,
  },

  "Worship Leader": {
    // Song permissions
    view: true,
    add: true,
    delete: true,
    editLyrics: true,
    generateMusicData: false,
    editChords: false,
    editNumberCode: false,
    editTabs: false,
    manageTeam: false,

    // Setlist permissions
    createSetlist: true,
    editSetlist: true,
    addSetlistSongs: true,
    reorderSetlistSongs: true,
    removeSetlistSongs: true,
    deleteSetlist: true,
    editServiceKey: true,
  },

  Musician: {
    // Song permissions
    view: true,
    add: true,
    delete: true,
    editLyrics: false,
    generateMusicData: true,
    editChords: true,
    editNumberCode: true,
    editTabs: true,
    manageTeam: false,

    // Setlist permissions
    createSetlist: true,
    editSetlist: true,
    addSetlistSongs: true,
    reorderSetlistSongs: true,
    removeSetlistSongs: false,
    deleteSetlist: false,
    editServiceKey: true,
  },

  Viewer: {
    // Song permissions
    view: true,
    add: false,
    delete: false,
    editLyrics: false,
    generateMusicData: false,
    editChords: false,
    editNumberCode: false,
    editTabs: false,
    manageTeam: false,

    // Setlist permissions
    createSetlist: false,
    editSetlist: false,
    addSetlistSongs: false,
    reorderSetlistSongs: false,
    removeSetlistSongs: false,
    deleteSetlist: false,
    editServiceKey: false,
  },
};

export function hasPermission(
  role: HimigRole,
  permission: HimigPermission
): boolean {
  return permissions[role]?.[permission] ?? false;
}

// --------------------------------------------------
// Song permissions
// --------------------------------------------------

export function canView(role: HimigRole): boolean {
  return hasPermission(role, "view");
}

export function canAdd(role: HimigRole): boolean {
  return hasPermission(role, "add");
}

export function canDelete(role: HimigRole): boolean {
  return hasPermission(role, "delete");
}

export function canEditLyrics(role: HimigRole): boolean {
  return hasPermission(role, "editLyrics");
}

export function canGenerateMusicData(
  role: HimigRole
): boolean {
  return hasPermission(
    role,
    "generateMusicData"
  );
}

export function canEditChords(
  role: HimigRole
): boolean {
  return hasPermission(
    role,
    "editChords"
  );
}

export function canEditNumberCode(
  role: HimigRole
): boolean {
  return hasPermission(
    role,
    "editNumberCode"
  );
}

export function canEditTabs(
  role: HimigRole
): boolean {
  return hasPermission(
    role,
    "editTabs"
  );
}

export function canManageTeam(
  role: HimigRole
): boolean {
  return hasPermission(
    role,
    "manageTeam"
  );
}

export function canEdit(
  role: HimigRole
): boolean {
  return canEditLyrics(role);
}

// --------------------------------------------------
// Setlist permissions
// --------------------------------------------------

export function canCreateSetlist(
  role: HimigRole
): boolean {
  return hasPermission(
    role,
    "createSetlist"
  );
}

export function canEditSetlist(
  role: HimigRole
): boolean {
  return hasPermission(
    role,
    "editSetlist"
  );
}

export function canAddSetlistSongs(
  role: HimigRole
): boolean {
  return hasPermission(
    role,
    "addSetlistSongs"
  );
}

export function canReorderSetlistSongs(
  role: HimigRole
): boolean {
  return hasPermission(
    role,
    "reorderSetlistSongs"
  );
}

export function canRemoveSetlistSongs(
  role: HimigRole
): boolean {
  return hasPermission(
    role,
    "removeSetlistSongs"
  );
}

export function canDeleteSetlist(
  role: HimigRole
): boolean {
  return hasPermission(
    role,
    "deleteSetlist"
  );
}

export function canEditServiceKey(
  role: HimigRole
): boolean {
  return hasPermission(
    role,
    "editServiceKey"
  );
}

export const ROLE_DESCRIPTIONS: Record<
  HimigRole,
  string
> = {
  "Owner/Admin":
    "Full access to songs, lyrics, music data, setlists, team members, and app settings.",

  "Worship Leader":
    "Can view, add, delete, and edit song lyrics, and can fully manage shared setlists, but cannot manage chords, number code, tabs, or AI music generation.",

  Musician:
    "Can view, add, and delete songs and can generate and edit chords, number code, and tabs. Can create and arrange shared setlists, but cannot remove songs from or delete shared setlists.",

  Viewer:
    "View-only access to songs and setlists.",
};