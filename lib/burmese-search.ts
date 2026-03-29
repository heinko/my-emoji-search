import { sylbreak } from './sylbreak';
import {
  buildMyanmarSearchLexicon,
  compactMyanmarText,
  containsMyanmarText,
  normalizeMyanmarSearchText,
  type MyanmarSearchLexicon,
} from './burmese-lexicon';

type BurmeseSearchSource = {
  localizedKeywords?: string[];
  localizedName?: string;
  wordTokens?: string[];
};

export interface BurmeseSearchMetadata {
  wordTokens: string[];
}

export interface BurmeseQueryAnalysis {
  compactQuery: string;
  expandedTerms: string[];
  queryViews: Array<{ text: string; weight: number }>;
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
  return normalizeMyanmarSearchText(value)
    .split(/[၊။,;]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function expandBurmeseConceptTerms(terms: string[]): string[] {
  return uniqueOrdered(terms.filter((term) => containsMyanmarText(term)));
}

export function buildEmojiSearchLexicon(entries: BurmeseSearchSource[]): MyanmarSearchLexicon {
  const lexiconTerms: string[] = [];

  for (const entry of entries) {
    if (entry.localizedName) {
      lexiconTerms.push(entry.localizedName);
    }
    lexiconTerms.push(...(entry.localizedKeywords ?? []));
    lexiconTerms.push(...(entry.wordTokens ?? []));
  }

  return buildMyanmarSearchLexicon(lexiconTerms);
}

export function buildBurmeseSearchMetadata(
  myName: string,
  keywords: string[],
  lexicon: MyanmarSearchLexicon
): BurmeseSearchMetadata {
  const rawTerms = uniqueOrdered(
    [myName, ...keywords]
      .flatMap((value) => splitMyanmarField(value))
      .filter((value) => containsMyanmarText(value))
  );

  const recoveredTerms = rawTerms.flatMap((term) => {
    const compactTerm = compactMyanmarText(term);
    const syllables = deriveQuerySyllables(compactTerm);
    const expandedTerms = buildExpandedTerms(compactTerm, syllables, lexicon);

    return uniqueOrdered([compactTerm, ...syllables, ...expandedTerms]);
  });

  return {
    wordTokens: uniqueOrdered(recoveredTerms),
  };
}

function deriveQuerySyllables(compactQuery: string): string[] {
  return uniqueOrdered(sylbreak(compactQuery));
}

const BURMESE_CONNECTOR_TERMS = new Set([
  'ကို',
  'က',
  'ကနေ',
  'ကျ',
  'ကြောင့်',
  'ခြင်း',
  'ငှာ',
  'စာ',
  'စွာ',
  'ဆီ',
  'နှင့်',
  'နဲ့',
  'တွင်',
  'တွင်း',
  'တွေနဲ့',
  'တွေပေါ်',
  'တွေအောက်',
  'ထဲ',
  'ထက်',
  'ထံ',
  'ထုတ်',
  'မှာ',
  'မှ',
  'ပေါ်',
  'ဘက်',
  'ဖြင့်',
  'ဖြစ်',
  'မှတစ်ဆင့်',
  'ရန်',
  'ရဲ့',
  'လည်း',
  'သော',
  'သည်',
  'သည့်',
  'သို့',
  'အတွက်',
  'အတွင်း',
  '၏',
]);

function buildConceptSpans(syllables: string[]): string[][] {
  const spans: string[][] = [];
  let current: string[] = [];

  for (const syllable of syllables) {
    if (BURMESE_CONNECTOR_TERMS.has(syllable)) {
      if (current.length > 0) {
        spans.push(current);
        current = [];
      }
      continue;
    }

    current.push(syllable);
  }

  if (current.length > 0) {
    spans.push(current);
  }

  return spans;
}

function buildExpandedTerms(
  compactQuery: string,
  syllables: string[],
  lexicon: MyanmarSearchLexicon
): string[] {
  const windows: string[] = [];

  for (const span of buildConceptSpans(syllables)) {
    if (span.length > 1) {
      windows.push(span.join(''));
    }

    for (let start = 0; start < span.length; start++) {
      for (let length = 2; length <= Math.min(4, span.length - start); length++) {
        const candidate = span.slice(start, start + length).join('');
        if (lexicon.scores.has(candidate)) {
          windows.push(candidate);
        }
      }
    }
  }

  return uniqueOrdered(
    expandBurmeseConceptTerms([compactQuery, ...windows]).filter(
      (term) => term !== compactQuery && !syllables.includes(term)
    )
  );
}

function buildBurmeseQueryViews(
  normalized: string,
  syllables: string[],
  expandedTerms: string[]
): Array<{ text: string; weight: number }> {
  const segmentedView = syllables.join(' ');
  const conceptViews = expandedTerms.filter((term) => term.length >= 4).slice(0, 6);

  return uniqueOrdered([normalized, segmentedView, ...conceptViews]).map(
    (text) => ({
      text,
      weight: text === normalized ? 1 : text === segmentedView ? 0.98 : 0.9,
    })
  );
}

export function analyzeBurmeseQuery(query: string, lexicon: MyanmarSearchLexicon): BurmeseQueryAnalysis {
  const normalized = normalizeMyanmarSearchText(query);
  const compactQuery = compactMyanmarText(normalized);
  const syllables = deriveQuerySyllables(compactQuery);
  const expandedTerms = buildExpandedTerms(compactQuery, syllables, lexicon);
  const queryViews = buildBurmeseQueryViews(normalized, syllables, expandedTerms);

  return {
    compactQuery,
    expandedTerms,
    queryViews,
    syllables,
  };
}
