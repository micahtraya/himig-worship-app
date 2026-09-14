// HIMIG Chord Engine
//
// Standalone music utility.
//
// This file does not modify Songs, Setlists, or Worship Mode.

export type KeyPreference = "sharp" | "flat";

export type ParsedChord = {
  root: string;
  quality: string;
  bass?: string;
};

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  "E#": 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

const SHARP_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const FLAT_NOTES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

/*
 * Keys where flat spelling is normally more readable.
 */
const FLAT_KEYS = new Set([
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Db",
  "Gb",
]);

/*
 * Keys where sharp spelling is normally more readable.
 */
const SHARP_KEYS = new Set([
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
]);

// --------------------------------------------------
// NOTE FUNCTIONS
// --------------------------------------------------

export function getNoteIndex(note: string): number | undefined {
  return NOTE_INDEX[note.trim()];
}

export function getNoteFromIndex(
  index: number,
  preference: KeyPreference = "sharp",
): string {
  const normalizedIndex = ((index % 12) + 12) % 12;

  return preference === "flat"
    ? FLAT_NOTES[normalizedIndex]
    : SHARP_NOTES[normalizedIndex];
}

// --------------------------------------------------
// KEY SPELLING
// --------------------------------------------------

export function prefersFlats(key: string): boolean {
  const normalized = key.trim();

  if (FLAT_KEYS.has(normalized)) {
    return true;
  }

  if (SHARP_KEYS.has(normalized)) {
    return false;
  }

  /*
   * If the key itself is written with a flat,
   * preserve that musical preference.
   */
  if (normalized.includes("b")) {
    return true;
  }

  return false;
}

export function getKeyPreference(key: string): KeyPreference {
  return prefersFlats(key) ? "flat" : "sharp";
}

export function normalizeKey(
  key: string,
  preference?: KeyPreference,
): string {
  const index = getNoteIndex(key);

  if (index === undefined) {
    return key;
  }

  const selectedPreference =
    preference ?? getKeyPreference(key);

  return getNoteFromIndex(index, selectedPreference);
}

/*
 * Returns the preferred spelling for a destination key.
 *
 * Example:
 *
 * Bb -> flat
 * Eb -> flat
 * A  -> sharp
 * E  -> sharp
 */
export function getKeySpelling(
  key: string,
): KeyPreference {
  return getKeyPreference(key);
}

// --------------------------------------------------
// KEY TRANSPOSITION
// --------------------------------------------------

export function getKeyDistance(
  fromKey: string,
  toKey: string,
): number {
  const fromIndex = getNoteIndex(fromKey);
  const toIndex = getNoteIndex(toKey);

  if (fromIndex === undefined || toIndex === undefined) {
    return 0;
  }

  return (toIndex - fromIndex + 12) % 12;
}

export function transposeNote(
  note: string,
  semitones: number,
  preference?: KeyPreference,
): string {
  const index = getNoteIndex(note);

  if (index === undefined) {
    return note;
  }

  const selectedPreference =
    preference ??
    (prefersFlats(note) ? "flat" : "sharp");

  return getNoteFromIndex(
    index + semitones,
    selectedPreference,
  );
}

// --------------------------------------------------
// CHORD PARSING
// --------------------------------------------------

/*
 * Chord quality is deliberately kept as text.
 *
 * This allows HIMIG to preserve the exact musical
 * quality while only changing the root/bass notes.
 *
 * Examples:
 *
 * C
 * Cm
 * Cmin7
 * C7
 * Cmaj7
 * Cmaj9
 * C9
 * C6
 * Cm6
 * Cdim
 * Cdim7
 * Caug
 * Csus
 * Csus2
 * Csus4
 * Cadd9
 * C6/9
 * Cm6/9
 * G/B
 * D/F#
 */

export function parseChord(
  chord: string,
): ParsedChord | null {
  const trimmed = chord.trim();

  if (!trimmed) {
    return null;
  }

  /*
   * Handle chord qualities that contain a slash first.
   *
   * Examples:
   * C6/9
   * Cm6/9
   *
   * These are NOT slash chords.
   * The /9 is part of the chord quality.
   */
  const slashQualityMatch = trimmed.match(
    /^([A-G](?:#|b)?)(m?6\/9)$/,
  );

  if (slashQualityMatch) {
    const [, root, quality] = slashQualityMatch;

    if (getNoteIndex(root) === undefined) {
      return null;
    }

    return {
      root,
      quality,
    };
  }

  /*
   * Handle normal chords and slash chords.
   *
   * Examples:
   * C
   * Cm
   * Cmaj7
   * G/B
   * D/F#
   * Bbmaj7
   */
  const match = trimmed.match(
    /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/,
  );

  if (!match) {
    return null;
  }

  const [, root, quality, bass] = match;

  if (getNoteIndex(root) === undefined) {
    return null;
  }

  if (
    bass !== undefined &&
    getNoteIndex(bass) === undefined
  ) {
    return null;
  }

  return {
    root,
    quality,
    bass,
  };
}

// --------------------------------------------------
// CHORD VALIDATION
// --------------------------------------------------

/*
 * Known chord-quality patterns.
 *
 * The engine does not need to calculate the individual
 * notes inside the chord at this stage.
 *
 * It needs to recognize realistic chord symbols and
 * preserve their quality during transposition.
 */
const VALID_QUALITY_PATTERNS = [
  "",
  "m",
  "min",
  "maj",
  "dim",
  "aug",
  "sus",
  "sus2",
  "sus4",
  "7",
  "9",
  "11",
  "13",
  "maj7",
  "maj9",
  "maj11",
  "maj13",
  "m7",
  "m9",
  "m11",
  "m13",
  "min7",
  "min9",
  "min11",
  "min13",
  "dim7",
  "m7b5",
  "6",
  "m6",
  "add9",
  "add11",
  "add13",
  "6/9",
  "m6/9",
];

export function isRecognizedQuality(
  quality: string,
): boolean {
  if (VALID_QUALITY_PATTERNS.includes(quality)) {
    return true;
  }

  /*
   * Allow common altered extensions such as:
   *
   * 7b5
   * 7#5
   * 7b9
   * 7#9
   * 9b5
   * 9#5
   */
  return /^m?(?:7|9|11|13)(?:[b#](?:5|9|11|13))+$/.test(
    quality,
  );
}

export function isChord(chord: string): boolean {
  const trimmed = chord.trim();

  // C6/9 and Cm6/9 are valid chord qualities.
  if (/^[A-G](?:#|b)?m?6\/9$/.test(trimmed)) {
    return true;
  }

  const parsed = parseChord(trimmed);

  if (!parsed) {
    return false;
  }

  return isRecognizedQuality(parsed.quality);
}

export function validateChord(
  chord: string,
): {
  valid: boolean;
  parsed: ParsedChord | null;
} {
  const parsed = parseChord(chord);

  if (!parsed) {
    return {
      valid: false,
      parsed: null,
    };
  }

  return {
    valid: isRecognizedQuality(parsed.quality),
    parsed,
  };
}

// --------------------------------------------------
// CHORD TRANSPOSITION
// --------------------------------------------------

export function transposeChord(
  chord: string,
  semitones: number,
  preference?: KeyPreference,
): string {
  const parsed = parseChord(chord);

  if (!parsed) {
    return chord;
  }

  const selectedPreference =
    preference ??
    (prefersFlats(parsed.root) ? "flat" : "sharp");

  const newRoot = transposeNote(
    parsed.root,
    semitones,
    selectedPreference,
  );

  const newBass = parsed.bass
    ? transposeNote(
        parsed.bass,
        semitones,
        selectedPreference,
      )
    : undefined;

  return `${newRoot}${parsed.quality}${
    newBass ? `/${newBass}` : ""
  }`;
}

/*
 * Transpose a chord specifically toward a destination key.
 *
 * This is more musically useful than simply specifying
 * sharp/flat manually.
 */
export function transposeChordToKey(
  chord: string,
  fromKey: string,
  toKey: string,
): string {
  const semitones = getKeyDistance(
    fromKey,
    toKey,
  );

  const preference = getKeySpelling(toKey);

  return transposeChord(
    chord,
    semitones,
    preference,
  );
}

// --------------------------------------------------
// CHORD TEXT TRANSPOSITION
// --------------------------------------------------

/*
 * This pattern finds chord symbols enclosed in [ ].
 *
 * HIMIG's lyric/chord format commonly looks like:
 *
 * [G] Amazing grace
 * [C] How sweet the sound
 *
 * Keeping the bracket handling explicit greatly reduces
 * the chance of interpreting ordinary lyric words as chords.
 */
const BRACKET_CHORD_PATTERN =
  /\[([A-G](?:#|b)?[^/\]\s]*(?:\/[A-G](?:#|b)?)?)\]/g;

export function transposeChordLine(
  line: string,
  semitones: number,
  preference?: KeyPreference,
): string {
  /*
   * First handle bracketed chord notation.
   */
  let result = line.replace(
    BRACKET_CHORD_PATTERN,
    (fullMatch, chord: string) =>
      `[${transposeChord(
        chord,
        semitones,
        preference,
      )}]`,
  );

  /*
   * Also support plain chord-only lines.
   *
   * Example:
   *
   * G   C   Em   D
   *
   * We deliberately avoid attempting to replace ordinary
   * lyric words here.
   */
  const trimmed = result.trim();

  if (
    trimmed &&
    trimmed.split(/\s+/).every((token) => isChord(token))
  ) {
    const leadingWhitespace =
      result.match(/^\s*/)?.[0] ?? "";

    const trailingWhitespace =
      result.match(/\s*$/)?.[0] ?? "";

    const transposed = trimmed
      .split(/\s+/)
      .map((token) =>
        transposeChord(
          token,
          semitones,
          preference,
        ),
      )
      .join(" ");

    result =
      leadingWhitespace +
      transposed +
      trailingWhitespace;
  }

  return result;
}

export function transposeChordText(
  text: string | undefined,
  semitones: number,
  preference?: KeyPreference,
): string {
  if (!text) {
    return "";
  }

  if (semitones === 0) {
    return text;
  }

  return text
    .split("\n")
    .map((line) =>
      transposeChordLine(
        line,
        semitones,
        preference,
      ),
    )
    .join("\n");
}

/*
 * Transpose an entire song from its original key to a
 * destination/service key.
 */
export function transposeSongToKey(
  text: string | undefined,
  fromKey: string,
  toKey: string,
): string {
  if (!text) {
    return "";
  }

  const semitones = getKeyDistance(
    fromKey,
    toKey,
  );

  const preference = getKeySpelling(toKey);

  return transposeChordText(
    text,
    semitones,
    preference,
  );
}