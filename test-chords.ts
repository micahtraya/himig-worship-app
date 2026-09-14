import {
  isChord,
  normalizeKey,
  getKeySpelling,
  transposeChord,
  transposeChordToKey,
  transposeSongToKey,
} from "./lib/chords";

console.log("======================================");
console.log("   HIMIG KEY-AWARE CHORD ENGINE");
console.log("======================================");

// --------------------------------------------------
// TEST 1 — COMMON CHORDS
// --------------------------------------------------

console.log("\nTEST 1 — Common Chords");

const commonChords = [
  "C",
  "Cm",
  "Dm",
  "Em",
  "F",
  "G",
  "Am",
  "Bb",
  "Eb",
  "Ab",
  "F#m",
  "Bm",
];

for (const chord of commonChords) {
  console.log(
    `${chord.padEnd(6)} -> ${
      isChord(chord) ? "VALID" : "INVALID"
    }`,
  );
}

// --------------------------------------------------
// TEST 2 — EXTENDED CHORDS
// --------------------------------------------------

console.log("\nTEST 2 — Extended Chords");

const extendedChords = [
  "C7",
  "C9",
  "C11",
  "C13",
  "Cmaj7",
  "Cmaj9",
  "Cm7",
  "Cm9",
  "Cm11",
  "Cdim",
  "Cdim7",
  "Caug",
  "Csus",
  "Csus2",
  "Csus4",
  "C6",
  "Cm6",
  "Cadd9",
  "Cadd11",
  "C6/9",
  "Cm6/9",
  "C7b5",
  "C7#5",
  "C7b9",
  "C9#5",
];

for (const chord of extendedChords) {
  console.log(
    `${chord.padEnd(8)} -> ${
      isChord(chord) ? "VALID" : "INVALID"
    }`,
  );
}

// --------------------------------------------------
// TEST 3 — KEY SPELLING
// --------------------------------------------------

console.log("\nTEST 3 — Key Spelling");

const keys = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Db",
  "Gb",
];

for (const key of keys) {
  console.log(
    `${key.padEnd(3)} -> ${getKeySpelling(key)}`,
  );
}

// --------------------------------------------------
// TEST 4 — KEY NORMALIZATION
// --------------------------------------------------

console.log("\nTEST 4 — Key Normalization");

const normalizationTests = [
  "C#",
  "Db",
  "D#",
  "Eb",
  "F#",
  "Gb",
  "G#",
  "Ab",
  "A#",
  "Bb",
];

for (const key of normalizationTests) {
  console.log(
    `${key.padEnd(3)} -> sharp: ${normalizeKey(
      key,
      "sharp",
    )} | flat: ${normalizeKey(key, "flat")}`,
  );
}

// --------------------------------------------------
// TEST 5 — TRANSPOSITION TO A KEY
// --------------------------------------------------

console.log("\nTEST 5 — Transpose To Destination Key");

const keyTests = [
  ["C", "G", "C"],
  ["C", "G", "F"],
  ["C", "G", "Am"],
  ["G", "Bb", "G"],
  ["G", "Bb", "C"],
  ["G", "Bb", "D"],
  ["G", "Bb", "Em"],
  ["G", "A", "G"],
  ["G", "A", "C"],
  ["G", "A", "D"],
  ["G", "A", "Em"],
];

for (const [fromKey, toKey, chord] of keyTests) {
  console.log(
    `${chord} | ${fromKey} -> ${toKey} = ${transposeChordToKey(
      chord,
      fromKey,
      toKey,
    )}`,
  );
}

// --------------------------------------------------
// TEST 6 — SLASH CHORDS
// --------------------------------------------------

console.log("\nTEST 6 — Slash Chords");

const slashChords = [
  "G/B",
  "D/F#",
  "C/E",
  "A/C#",
  "E/G#",
  "Bb/D",
  "F/A",
];

for (const chord of slashChords) {
  console.log(
    `${chord.padEnd(8)} +2 -> ${transposeChord(
      chord,
      2,
    )}`,
  );
}

// --------------------------------------------------
// TEST 7 — REALISTIC WORSHIP SONG
// --------------------------------------------------

console.log("\nTEST 7 — Worship Song");

const song = `[G] Dakila Ka O Diyos
[C] Sa lahat ng panahon
[Em] Ikaw ang aking Diyos
[D] Magpakailanman
[G/B] Ikaw ang sandigan
[C] Ng buhay ko
[Am7] Ikaw ang aking pag-asa
[D] Magpakailanman`;

console.log("\nORIGINAL — KEY G:");
console.log(song);

console.log("\nSERVICE KEY — A:");
console.log(
  transposeSongToKey(
    song,
    "G",
    "A",
  ),
);

console.log("\nSERVICE KEY — Bb:");
console.log(
  transposeSongToKey(
    song,
    "G",
    "Bb",
  ),
);

console.log("\nSERVICE KEY — F:");
console.log(
  transposeSongToKey(
    song,
    "G",
    "F",
  ),
);

// --------------------------------------------------
// TEST 8 — COMPLEX WORSHIP SONG
// --------------------------------------------------

console.log("\nTEST 8 — Complex Chords");

const complexSong = `[Bbmaj7] Ikaw ang aking Diyos
[Ebadd9] Sa bawat araw
[F] Hindi Mo ako iiwan
[Gm7] Kailanman
[Bb/D] Ikaw ang aking lakas
[Eb] Ikaw ang pag-asa`;

console.log("\nORIGINAL — KEY Bb:");
console.log(complexSong);

console.log("\nSERVICE KEY — C:");
console.log(
  transposeSongToKey(
    complexSong,
    "Bb",
    "C",
  ),
);

console.log("\nSERVICE KEY — Eb:");
console.log(
  transposeSongToKey(
    complexSong,
    "Bb",
    "Eb",
  ),
);

// --------------------------------------------------
// TEST 9 — PLAIN CHORD LINE
// --------------------------------------------------

console.log("\nTEST 9 — Plain Chord Line");

const chordLine = "G C Em D";

console.log("Original:");
console.log(chordLine);

console.log("Transposed +2:");
console.log(
  transposeSongToKey(
    chordLine,
    "G",
    "A",
  ),
);

// --------------------------------------------------
// COMPLETE
// --------------------------------------------------

console.log("\n======================================");
console.log("   KEY-AWARE TEST COMPLETE");
console.log("======================================");