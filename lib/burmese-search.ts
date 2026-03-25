import { sylbreak } from './sylbreak';
import {
  buildOppaWordLexicon,
  compactMyanmarText,
  containsMyanmarText,
  normalizeOppaWordText,
  segmentWithOppaWord,
  type OppaWordLexicon,
} from './oppa-word';

type BurmeseSearchSource = {
  keywords?: string[];
  myName?: string;
  searchTextMy?: string;
  wordTokens?: string[];
};

export interface BurmeseSearchMetadata {
  searchTextMy: string;
  wordTokens: string[];
}

export interface BurmeseQueryAnalysis {
  compactQuery: string;
  expandedTerms: string[];
  queryViews: Array<{ text: string; weight: number }>;
  segmentedTerms: string[];
  syllables: string[];
}

export function uniqueOrdered(values: Iterable<string>): string[] {
  const unique = new Set<string>();

  for (const value of values) {
    const normalized = value.trim();
    if (normalized) {
      unique.add(normalized);
    }
  }

  return Array.from(unique);
}

function splitMyanmarField(value: string): string[] {
  return normalizeOppaWordText(value)
    .split(/[၊။,;]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function expandBurmeseConceptTerms(terms: string[]): string[] {
  return uniqueOrdered(terms.filter((term) => containsMyanmarText(term)));
}

export function buildEmojiSearchLexicon(entries: BurmeseSearchSource[]): OppaWordLexicon {
  const lexiconTerms: string[] = [];

  for (const entry of entries) {
    if (entry.myName) {
      lexiconTerms.push(entry.myName);
    }
    if (entry.searchTextMy) {
      lexiconTerms.push(entry.searchTextMy);
    }
    lexiconTerms.push(...(entry.keywords ?? []));
    lexiconTerms.push(...(entry.wordTokens ?? []));
  }

  return buildOppaWordLexicon(lexiconTerms);
}

export function buildBurmeseSearchMetadata(
  myName: string,
  keywords: string[],
  lexicon: OppaWordLexicon
): BurmeseSearchMetadata {
  const rawTerms = uniqueOrdered(
    [myName, ...keywords]
      .flatMap((value) => splitMyanmarField(value))
      .filter((value) => containsMyanmarText(value))
  );

  const segmentedTokens = uniqueOrdered(rawTerms.flatMap((term) => segmentWithOppaWord(term, lexicon)));
  const expandedTerms = uniqueOrdered(expandBurmeseConceptTerms([...rawTerms, ...segmentedTokens]));

  return {
    searchTextMy: uniqueOrdered([myName, ...keywords, ...segmentedTokens, ...expandedTerms]).join(' ။ '),
    wordTokens: uniqueOrdered([...segmentedTokens, ...expandedTerms]),
  };
}

export function analyzeBurmeseQuery(query: string, lexicon: OppaWordLexicon): BurmeseQueryAnalysis {
  const normalized = normalizeOppaWordText(query);
  const compactQuery = compactMyanmarText(normalized);
  const segmentedTerms = uniqueOrdered(segmentWithOppaWord(normalized, lexicon));
  const expandedTerms = uniqueOrdered(expandBurmeseConceptTerms(segmentedTerms));
  const syllables = sylbreak(compactQuery);

  const segmentedView = segmentedTerms.join(' ');
  const queryViews = uniqueOrdered([normalized, segmentedView]).map((text) => ({
    text,
    weight: text === normalized ? 1 : 0.98,
  }));

  return {
    compactQuery,
    expandedTerms,
    queryViews,
    segmentedTerms,
    syllables,
  };
}
