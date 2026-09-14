import {
  getNoteIndex,
  parseChord,
  type ParsedChord,
} from "@/lib/chords";

export type ImportedSongContent = {
  lyrics: string;
  chords: string;
  numberCode: string;
  tabs: string;
};

const CHORD_TOKEN_REGEX =
  /^(?:[A-G](?:#|b)?(?:m|min|maj|dim|aug|sus|sus2|sus4|7|9|11|13|maj7|maj9|maj11|maj13|m7|m9|m11|m13|min7|min9|min11|min13|dim7|m7b5|6|m6|add9|add11|add13|6\/9|m6\/9)?(?:[b#](?:5|9|11|13))?(?:\/[A-G](?:#|b)?)?)$/;

function isChordToken(token: string): boolean {
  const cleaned = token
    .trim()
    .replace(/^[([{]+/, "")
    .replace(/[)\]};:,]+$/, "");

  if (!cleaned) {
    return false;
  }

  if (!CHORD_TOKEN_REGEX.test(cleaned)) {
    return false;
  }

  const parsed = parseChord(cleaned);

  return parsed !== null;
}

function extractChordTokens(line: string): string[] {
  const tokens = line
    .trim()
    .split(/\s+/)
    .map((token) =>
      token
        .replace(/^[([{]+/, "")
        .replace(/[)\]};:,]+$/, ""),
    )
    .filter(Boolean);

  return tokens.filter(isChordToken);
}

function isChordOnlyLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return false;
  }

  const chordCount = tokens.filter(isChordToken).length;

  if (chordCount === 0) {
    return false;
  }

  /*
   * A chord-only line should consist entirely of chord symbols.
   *
   * This prevents normal lyric lines such as:
   *
   * "I will follow You"
   *
   * from being interpreted as chords.
   */
  return chordCount === tokens.length;
}

function extractLeadingChords(
  line: string,
): {
  chords: string[];
  lyric: string;
} {
  let remaining = line.trim();
  const chords: string[] = [];

  /*
   * Handles lines such as:
   *
   * E/G#    You gave it all for me
   * A       My soul desire
   *
   * We only extract chords from the beginning
   * of the line.
   */
  while (remaining) {
    const match = remaining.match(
      /^([A-G](?:#|b)?(?:m|min|maj|dim|aug|sus|sus2|sus4|7|9|11|13|maj7|maj9|maj11|maj13|m7|m9|m11|m13|min7|min9|min11|min13|dim7|m7b5|6|m6|add9|add11|add13|6\/9|m6\/9)?(?:[b#](?:5|9|11|13))?(?:\/[A-G](?:#|b)?)?)(?:\s+|$)/,
    );

    if (!match) {
      break;
    }

    const chord = match[1];

    if (!isChordToken(chord)) {
      break;
    }

    chords.push(chord);

    remaining = remaining
      .slice(match[0].length)
      .trimStart();
  }

  return {
    chords,
    lyric: remaining.trim(),
  };
}

function cleanChordLine(line: string): string {
  return line
    .replace(/\s+/g, " ")
    .trim();
}


function getQualitySuffix(
  parsed: ParsedChord,
): string {
  const quality = parsed.quality;

  if (!quality) {
    return "";
  }

  if (
    quality === "m" ||
    quality === "min"
  ) {
    return "m";
  }

  if (
    quality === "maj" ||
    quality === "maj7" ||
    quality === "maj9" ||
    quality === "maj11" ||
    quality === "maj13"
  ) {
    return quality;
  }

  return quality;
}

function getScaleDegree(
  root: string,
  songKey: string,
): string | null {
  const rootIndex = getNoteIndex(root);
  const keyIndex = getNoteIndex(songKey);

  if (
    rootIndex == null ||
    keyIndex == null
  ) {
    return null;
  }

  const semitoneDistance =
    (rootIndex - keyIndex + 12) % 12;

  const degreeMap: Record<number, string> = {
    0: "1",
    1: "b2",
    2: "2",
    3: "b3",
    4: "3",
    5: "4",
    6: "b5",
    7: "5",
    8: "b6",
    9: "6",
    10: "b7",
    11: "7",
  };

  return degreeMap[semitoneDistance] ?? null;
}

function chordToNumber(
  chord: string,
  songKey: string,
): string | null {
  const parsed = parseChord(chord);

  if (!parsed) {
    return null;
  }

  const degree = getScaleDegree(
    parsed.root,
    songKey,
  );

  if (!degree) {
    return null;
  }

  const qualitySuffix =
    getQualitySuffix(parsed);

  let result =
    degree + qualitySuffix;

  if (parsed.bass) {
    const bassDegree = getScaleDegree(
      parsed.bass,
      songKey,
    );

    if (bassDegree) {
      result =
        `${result}/${bassDegree}`;
    }
  }

  return result;
}

function convertChordLineToNumberLine(
  chordLine: string,
  songKey: string,
): string {
  const chords = chordLine
    .split(/\s+/)
    .filter(Boolean);

  const numbers = chords
    .map((chord) =>
      chordToNumber(
        chord,
        songKey,
      ),
    )
    .filter(
      (
        value,
      ): value is string =>
        value !== null,
    );

  return numbers.join(" - ");
}

function normalizeOutput(
  lines: string[],
): string {
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractSongContent(
  source: string,
  songKey: string,
): ImportedSongContent {
  const normalizedSource =
    source.replace(/\r\n/g, "\n");

  const lines =
    normalizedSource.split("\n");

  const lyricLines: string[] = [];

  /*
   * These two arrays now preserve the relationship
   * between the musical data and the lyrics.
   *
   * Example:
   *
   * B5 D
   * You say You want all of me
   *
   * becomes:
   *
   * CHORDS:
   * B5 D
   * You say You want all of me
   *
   * NUMBER SYSTEM:
   * 5 1
   * You say You want all of me
   */
  const chordSheetLines: string[] = [];
  const numberSheetLines: string[] = [];

  

  for (const originalLine of lines) {
    const line = originalLine.trim();

    /*
     * Preserve blank lines in all views.
     */
    if (!line) {
      lyricLines.push("");
      chordSheetLines.push("");
      numberSheetLines.push("");
      continue;
    }

    /*
     * Section headings should remain visible.
     *
     * Examples:
     * [Verse 1]
     * [Pre-chorus]
     * [Chorus]
     * [Bridge]
     */
    const sectionOnlyMatch =
      line.match(/^\[[^\]]+\]$/);

    if (sectionOnlyMatch) {
    

      lyricLines.push(line);
      chordSheetLines.push(line);
      numberSheetLines.push(line);

      continue;
    }

    /*
     * Completely chord-only line.
     *
     * Example:
     *
     * B5      D
     *
     * This becomes the musical line in the
     * Chords and Number System views.
     */
    if (isChordOnlyLine(line)) {
      const chords =
        extractChordTokens(line);

      if (chords.length > 0) {
        const chordLine =
          cleanChordLine(
            chords.join(" "),
          );

        chordSheetLines.push(
          chordLine,
        );

        const numberLine =
          convertChordLineToNumberLine(
            chordLine,
            songKey,
          );

        numberSheetLines.push(
          numberLine,
        );
      }

      /*
       * Chord-only lines are not placed in the
       * Lyrics-only view.
       */
      continue;
    }

    /*
     * Some copied chord sheets place a section
     * heading and chords on the same line:
     *
     * [Pre-chorus] B5 D
     */
    let workingLine = line;

    const sectionPrefix =
      workingLine.match(
        /^(\[[^\]]+\])\s+(.*)$/,
      );

    let sectionHeading = "";

    if (sectionPrefix) {
      sectionHeading =
        sectionPrefix[1];


      workingLine =
        sectionPrefix[2].trim();

      lyricLines.push(
        sectionHeading,
      );

      chordSheetLines.push(
        sectionHeading,
      );

      numberSheetLines.push(
        sectionHeading,
      );
    }

    /*
     * Extract chords appearing at the beginning
     * of a lyric line.
     *
     * Example:
     *
     * B5    You say You want all of me
     *
     * becomes:
     *
     * Lyrics:
     * You say You want all of me
     *
     * Chords:
     * B5
     * You say You want all of me
     *
     * Number System:
     * 5
     * You say You want all of me
     */
    const leading =
      extractLeadingChords(
        workingLine,
      );

    if (leading.chords.length > 0) {
      const chordLine =
        cleanChordLine(
          leading.chords.join(" "),
        );

      const lyric =
        leading.lyric;

      const numberLine =
        convertChordLineToNumberLine(
          chordLine,
          songKey,
        );

      /*
       * Lyrics-only view.
       *
       * We intentionally keep this clean so the
       * Worship Leader can edit the lyrics.
       */
      if (sectionHeading) {
        if (lyric) {
          lyricLines.push(lyric);
        }
      } else {
        lyricLines.push(lyric);
      }

      /*
       * Chords view.
       *
       * IMPORTANT:
       * The lyric is preserved directly underneath
       * the corresponding chord line.
       */
      chordSheetLines.push(
        chordLine,
      );

      if (lyric) {
        chordSheetLines.push(
          lyric,
        );
      }

      /*
       * Nashville Number Code view.
       *
       * The number line is preserved directly
       * above its corresponding lyric.
       */
      if (numberLine) {
        numberSheetLines.push(
          numberLine,
        );
      }

      if (lyric) {
        numberSheetLines.push(
          lyric,
        );
      }

      continue;
    }

    /*
     * Normal lyric line.
     *
     * Preserve it in all appropriate views.
     */
    lyricLines.push(
      sectionHeading
        ? workingLine
        : originalLine,
    );

    /*
     * If this is a normal lyric line and there
     * was no chord information, keep it in the
     * Chords and Number System views too.
     *
     * This gives those views a complete song sheet
     * rather than a detached list of chords.
     */
    chordSheetLines.push(
      sectionHeading
        ? workingLine
        : originalLine,
    );

    numberSheetLines.push(
      sectionHeading
        ? workingLine
        : originalLine,
    );
  }

  /*
   * Remove excessive blank lines while preserving
   * normal paragraph and section spacing.
   */
  const lyrics =
    normalizeOutput(
      lyricLines,
    );

  const chords =
    normalizeOutput(
      chordSheetLines,
    );

  const numberCode =
    normalizeOutput(
      numberSheetLines,
    );

  /*
   * We intentionally do not invent guitar tabs
   * or instrument notes from chord names.
   *
   * Tabs require actual musical arrangement data
   * and should later be AI-assisted and reviewed
   * by a Musician.
   */
  const tabs = "";

  return {
    lyrics,
    chords,
    numberCode,
    tabs,
  };
}