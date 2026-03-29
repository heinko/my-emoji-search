import { sylbreak } from './sylbreak';

/**
 * Local Burmese search lexicon helpers.
 *
 * Provenance:
 * - `sylbreak` is used directly as the base syllable splitter.
 * - The Myanmar-space compaction step here is a local implementation, but it was
 *   shaped by the same preprocessing need discussed in Ye Kyaw Thu's `oppaWord`
 *   project, especially its configurable Myanmar space-removal stage.
 * - This file is not a direct port of `oppaWord` and does not implement its
 *   DAG, Bi-MM, LM, or post-editing pipeline.
 */

const MYANMAR_CHAR_PATTERN = /[\u1000-\u109F\uAA60-\uAA7F]/;
const MYANMAR_LETTER = String.raw`[\u1000-\u109F\uAA60-\uAA7F]`;
const MYANMAR_DIGIT = String.raw`[\u1040-\u1049]`;

const RE_MM_LETTER_SPACE = new RegExp(`(${MYANMAR_LETTER})\\s+(${MYANMAR_LETTER})`, 'g');
const RE_MM_DIGIT_DIGIT = new RegExp(`(${MYANMAR_DIGIT})\\s+(${MYANMAR_DIGIT})`, 'g');
const RE_MM_DIGIT_LETTER = new RegExp(`(${MYANMAR_DIGIT})\\s+(${MYANMAR_LETTER})`, 'g');
const RE_MM_LETTER_DIGIT = new RegExp(`(${MYANMAR_LETTER})\\s+(${MYANMAR_DIGIT})`, 'g');

const SPACE_PROTECTION_MARKER = '\u2603';

export interface MyanmarSearchLexicon {
  maxWordLength: number;
  scores: Map<string, number>;
}

export function containsMyanmarText(text: string): boolean {
  return MYANMAR_CHAR_PATTERN.test(text);
}

export function normalizeMyanmarSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u200B\u200C\u200D]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeMyanmarSpaces(text: string, preserveDigitBoundaries: boolean): string {
  let output = normalizeMyanmarSearchText(text);

  if (preserveDigitBoundaries) {
    // Similar in intent to Burmese preprocessing modes like oppaWord's
    // "my_not_num": compact Myanmar spaces while keeping digit boundaries safer.
    output = output
      .replace(RE_MM_DIGIT_DIGIT, `$1${SPACE_PROTECTION_MARKER}$2`)
      .replace(RE_MM_DIGIT_LETTER, `$1${SPACE_PROTECTION_MARKER}$2`)
      .replace(RE_MM_LETTER_DIGIT, `$1${SPACE_PROTECTION_MARKER}$2`);
  }

  let previous = '';
  while (previous !== output) {
    previous = output;
    output = output.replace(RE_MM_LETTER_SPACE, '$1$2');
  }

  if (preserveDigitBoundaries) {
    output = output.replace(new RegExp(SPACE_PROTECTION_MARKER, 'g'), ' ');
  }

  return output;
}

export function compactMyanmarText(text: string): string {
  const normalized = normalizeMyanmarSearchText(text);
  if (!containsMyanmarText(normalized)) {
    return normalized;
  }

  return removeMyanmarSpaces(normalized, true).replace(/\s+/g, '').trim();
}

function extractLexiconCandidates(text: string): string[] {
  const normalized = normalizeMyanmarSearchText(text);
  if (!containsMyanmarText(normalized)) {
    return [];
  }

  const unique = new Set<string>();
  const rawChunks = normalized
    .split(/[၊။,;:!?()[\]{}"\\/|]+/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  for (const chunk of rawChunks) {
    unique.add(chunk);
    unique.add(compactMyanmarText(chunk));

    const spaceParts = chunk.split(/\s+/).filter(Boolean);
    for (const part of spaceParts) {
      unique.add(part);
      unique.add(compactMyanmarText(part));
    }

    if (spaceParts.length > 1) {
      for (let length = 2; length <= spaceParts.length; length++) {
        for (let start = 0; start + length <= spaceParts.length; start++) {
          unique.add(spaceParts.slice(start, start + length).join(''));
        }
      }
    }
  }

  return Array.from(unique)
    .map((candidate) => compactMyanmarText(candidate))
    .filter((candidate) => Boolean(candidate) && containsMyanmarText(candidate));
}

export function buildMyanmarSearchLexicon(terms: string[]): MyanmarSearchLexicon {
  const scores = new Map<string, number>();
  let maxWordLength = 2;

  for (const term of terms) {
    for (const candidate of extractLexiconCandidates(term)) {
      const syllableCount = sylbreak(candidate).length;
      if (syllableCount === 0) {
        continue;
      }

      const current = scores.get(candidate) ?? 0;
      const lengthWeight = 1 + Math.min(syllableCount, 6) * 0.45;
      scores.set(candidate, current + lengthWeight);
      maxWordLength = Math.max(maxWordLength, syllableCount);
    }
  }

  return {
    maxWordLength: Math.max(2, Math.min(12, maxWordLength)),
    scores,
  };
}
