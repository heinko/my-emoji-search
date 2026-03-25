import { sylbreak } from './sylbreak';

/**
 * Lightweight oppaWord-inspired segmenter for Burmese search.
 *
 * Source reviewed:
 * - https://github.com/ye-kyaw-thu/oppaWord
 *
 * This adapts oppaWord's syllable-first, DAG + Bi-MM style segmentation to a
 * smaller in-app lexicon built from emoji names, keywords, and curated search
 * aliases. It intentionally does not pull in the full external dictionary/LM.
 */

const MYANMAR_CHAR_PATTERN = /[\u1000-\u109F\uAA60-\uAA7F]/;
const MYANMAR_LETTER = String.raw`[\u1000-\u109F\uAA60-\uAA7F]`;
const MYANMAR_DIGIT = String.raw`[\u1040-\u1049]`;

const RE_MM_LETTER_SPACE = new RegExp(`(${MYANMAR_LETTER})\\s+(${MYANMAR_LETTER})`, 'g');
const RE_MM_DIGIT_DIGIT = new RegExp(`(${MYANMAR_DIGIT})\\s+(${MYANMAR_DIGIT})`, 'g');
const RE_MM_DIGIT_LETTER = new RegExp(`(${MYANMAR_DIGIT})\\s+(${MYANMAR_LETTER})`, 'g');
const RE_MM_LETTER_DIGIT = new RegExp(`(${MYANMAR_LETTER})\\s+(${MYANMAR_DIGIT})`, 'g');

const SPACE_PROTECTION_MARKER = '\u2603';

interface SegmentEdge {
  end: number;
  score: number;
  word: string;
}

export interface OppaWordLexicon {
  maxWordLength: number;
  scores: Map<string, number>;
}

export function containsMyanmarText(text: string): boolean {
  return MYANMAR_CHAR_PATTERN.test(text);
}

export function normalizeOppaWordText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u200B\u200C\u200D]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeMyanmarSpaces(text: string, preserveDigitBoundaries: boolean): string {
  let output = normalizeOppaWordText(text);

  if (preserveDigitBoundaries) {
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
  const normalized = normalizeOppaWordText(text);
  if (!containsMyanmarText(normalized)) {
    return normalized;
  }

  return removeMyanmarSpaces(normalized, true).replace(/\s+/g, '').trim();
}

function extractLexiconCandidates(text: string): string[] {
  const normalized = normalizeOppaWordText(text);
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

export function buildOppaWordLexicon(terms: string[]): OppaWordLexicon {
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

function buildForwardMaximumMatch(
  syllables: string[],
  lexicon: OppaWordLexicon
): SegmentEdge[] {
  const edges: SegmentEdge[] = [];
  let index = 0;

  while (index < syllables.length) {
    let chosen: SegmentEdge | null = null;

    for (
      let length = Math.min(lexicon.maxWordLength, syllables.length - index);
      length >= 1;
      length--
    ) {
      const word = syllables.slice(index, index + length).join('');
      const score = lexicon.scores.get(word);
      if (score !== undefined) {
        chosen = { end: index + length, score, word };
        break;
      }
    }

    if (!chosen) {
      chosen = { end: index + 1, score: -1.5, word: syllables[index] };
    }

    edges.push(chosen);
    index = chosen.end;
  }

  return edges;
}

function buildBackwardMaximumMatch(
  syllables: string[],
  lexicon: OppaWordLexicon
): Array<SegmentEdge & { start: number }> {
  const edges: Array<SegmentEdge & { start: number }> = [];
  let index = syllables.length;

  while (index > 0) {
    let chosen: (SegmentEdge & { start: number }) | null = null;

    for (let length = Math.min(lexicon.maxWordLength, index); length >= 1; length--) {
      const start = index - length;
      const word = syllables.slice(start, index).join('');
      const score = lexicon.scores.get(word);
      if (score !== undefined) {
        chosen = { start, end: index, score, word };
        break;
      }
    }

    if (!chosen) {
      chosen = { start: index - 1, end: index, score: -1.5, word: syllables[index - 1] };
    }

    edges.unshift(chosen);
    index = chosen.start;
  }

  return edges;
}

function wordScore(word: string, lexiconScore: number, isBiMm: boolean): number {
  const syllableCount = Math.max(1, sylbreak(word).length);

  if (lexiconScore <= 0) {
    return -2.5;
  }

  const score = 4 + lexiconScore + syllableCount * 1.2;
  return isBiMm ? score + 1.5 : score;
}

export function segmentWithOppaWord(text: string, lexicon: OppaWordLexicon): string[] {
  const normalized = normalizeOppaWordText(text);
  if (!normalized) {
    return [];
  }

  if (!containsMyanmarText(normalized)) {
    return normalized.split(/\s+/).filter(Boolean);
  }

  const compact = compactMyanmarText(normalized);
  const syllables = sylbreak(compact);

  if (syllables.length <= 1) {
    return compact ? [compact] : [];
  }

  const forward = buildForwardMaximumMatch(syllables, lexicon);
  const backward = buildBackwardMaximumMatch(syllables, lexicon);
  const biMmPath = forward.length <= backward.length ? forward : backward;

  const dag = new Map<number, SegmentEdge[]>();
  for (let start = 0; start < syllables.length; start++) {
    const edges: SegmentEdge[] = [];

    for (
      let length = 1;
      length <= Math.min(lexicon.maxWordLength, syllables.length - start);
      length++
    ) {
      const word = syllables.slice(start, start + length).join('');
      const score = lexicon.scores.get(word);
      if (score !== undefined) {
        edges.push({ end: start + length, score, word });
      }
    }

    edges.push({ end: start + 1, score: -1.5, word: syllables[start] });
    dag.set(start, edges);
  }

  let biMmStart = 0;
  for (const edge of biMmPath) {
    const current = dag.get(biMmStart) ?? [];
    current.push({
      end: edge.end,
      score: edge.score + 2.5,
      word: edge.word,
    });
    dag.set(biMmStart, current);
    biMmStart = edge.end;
  }

  const bestScores = Array.from({ length: syllables.length + 1 }, () => Number.NEGATIVE_INFINITY);
  const previous: Array<{ index: number; word: string } | null> = Array.from(
    { length: syllables.length + 1 },
    () => null
  );
  bestScores[0] = 0;

  for (let start = 0; start < syllables.length; start++) {
    const baseScore = bestScores[start];
    if (!Number.isFinite(baseScore)) {
      continue;
    }

    for (const edge of dag.get(start) ?? []) {
      const isBiMm = edge.score > (lexicon.scores.get(edge.word) ?? -Infinity);
      const candidateScore = baseScore + wordScore(edge.word, edge.score, isBiMm);
      if (candidateScore > bestScores[edge.end]) {
        bestScores[edge.end] = candidateScore;
        previous[edge.end] = { index: start, word: edge.word };
      }
    }
  }

  const words: string[] = [];
  let cursor = syllables.length;
  while (cursor > 0) {
    const step = previous[cursor];
    if (!step) {
      return syllables;
    }
    words.push(step.word);
    cursor = step.index;
  }

  return words.reverse();
}
