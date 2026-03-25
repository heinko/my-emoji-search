import type { EmojiItem } from './emoji-data';
import { extractRequestedSkinTones, type SkinToneId } from './emoji-skin-tone';
import {
  analyzeBurmeseQuery,
  buildEmojiSearchLexicon,
  type BurmeseQueryAnalysis,
} from './burmese-search';
import { compactMyanmarText, containsMyanmarText, type OppaWordLexicon } from './oppa-word';

export interface QueryAnalysis {
  compactQuery?: string;
  englishTokens: string[];
  isBurmeseQuery: boolean;
  requestedSkinTones: SkinToneId[];
  semanticViews: Array<{ text: string; weight: number }>;
  segmentedTerms: string[];
}

export interface QueryEmbedding {
  text: string;
  vector: number[];
  weight: number;
}

export interface SemanticSignal {
  ceiling: number;
  floor: number;
  scores: Map<string, number>;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function tokenizeEnglish(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? []).filter(Boolean);
}

function getPercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * percentile))
  );

  return sorted[index];
}

export function cosineSimilarity(
  v1: number[] | Float32Array,
  v2: number[] | Float32Array
): number {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;

  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    mA += v1[i] * v1[i];
    mB += v2[i] * v2[i];
  }

  const denominator = Math.sqrt(mA) * Math.sqrt(mB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export function buildSearchLexiconFromEmojiData(allEmojis: EmojiItem[]): OppaWordLexicon {
  return buildEmojiSearchLexicon(allEmojis);
}

export function analyzeSearchQuery(query: string, lexicon: OppaWordLexicon): QueryAnalysis {
  const normalized = query.toLowerCase().trim();
  const isBurmeseQuery = containsMyanmarText(normalized);
  const requestedSkinTones = extractRequestedSkinTones(normalized);

  if (!isBurmeseQuery) {
    return {
      englishTokens: tokenizeEnglish(normalized),
      isBurmeseQuery,
      requestedSkinTones,
      semanticViews: normalized ? [{ text: normalized, weight: 1 }] : [],
      segmentedTerms: [],
    };
  }

  const analysis: BurmeseQueryAnalysis = analyzeBurmeseQuery(normalized, lexicon);
  return {
    compactQuery: analysis.compactQuery,
    englishTokens: [],
    isBurmeseQuery,
    requestedSkinTones,
    semanticViews: analysis.queryViews,
    segmentedTerms: analysis.segmentedTerms,
  };
}

function uniqueSemanticViewText(terms: string[]): string {
  return Array.from(new Set(terms.map((term) => term.trim()).filter(Boolean))).join(' ');
}

export function buildSemanticSignal(
  allEmojis: EmojiItem[],
  embeddings: QueryEmbedding[]
): SemanticSignal {
  const scores = new Map<string, number>();
  const similarities = allEmojis
    .filter((emoji) => emoji.embedding && emoji.embedding.length > 0)
    .map((emoji) => {
      const similarity = Math.max(
        ...embeddings.map(({ vector, weight }) => cosineSimilarity(vector, emoji.embedding!) * weight)
      );
      scores.set(emoji.emoji, similarity);
      return similarity;
    });

  return {
    ceiling: getPercentile(similarities, 0.995),
    floor: getPercentile(similarities, 0.85),
    scores,
  };
}

function scoreEnglishLexical(emoji: EmojiItem, query: string, queryTokens: string[]): number {
  if (!query) return 0;

  const englishFields = [
    emoji.enName?.toLowerCase() ?? '',
    emoji.group?.toLowerCase() ?? '',
    emoji.subgroup?.toLowerCase() ?? '',
  ].filter(Boolean);

  const tokenSet = new Set(emoji.enTokens ?? tokenizeEnglish(englishFields.join(' ')));
  let score = 0;

  if (englishFields.some((field) => field === query)) {
    score += 2.2;
  }

  const phrasePattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(query)}($|[^a-z0-9])`, 'i');
  if (englishFields.some((field) => phrasePattern.test(field))) {
    score += 1.0;
  }

  const matchedWords = queryTokens.filter((token) => tokenSet.has(token));
  if (queryTokens.length > 0) {
    score += (matchedWords.length / queryTokens.length) * 0.9;
  }

  return score;
}

function hasBurmeseTermSupport(emoji: EmojiItem, term: string): boolean {
  if (!term) return false;

  const wordTokens = emoji.wordTokens ?? [];
  if (wordTokens.includes(term)) {
    return true;
  }

  const compactFields = [
    emoji.myName,
    emoji.searchTextMy,
    ...(emoji.keywords ?? []),
  ]
    .filter(Boolean)
    .map((field) => compactMyanmarText(field!));

  return compactFields.some((field) => field === term || field.includes(term));
}

function matchesContributorKeyword(emoji: EmojiItem, term: string): boolean {
  if (!term || !emoji.contributorKeywords?.length) {
    return false;
  }

  const compactContributorKeywords = emoji.contributorKeywords
    .map((keyword) => compactMyanmarText(keyword))
    .filter(Boolean);

  return compactContributorKeywords.some((keyword) => keyword === term || keyword.includes(term));
}

function shouldAllowBurmeseSubstringBoost(compactQuery: string): boolean {
  // Very short Burmese fragments tend to match too many unrelated entries.
  return compactQuery.length >= 4;
}

function scoreBurmeseLexical(emoji: EmojiItem, analysis: QueryAnalysis): number {
  const compactQuery = analysis.compactQuery;
  if (!compactQuery) return 0;

  let score = 0;
  const rawFields = [
    emoji.myName,
    ...(emoji.keywords ?? []),
    emoji.searchTextMy,
  ].filter(Boolean);
  const compactFields = rawFields
    .filter(Boolean)
    .map((field) => compactMyanmarText(field!));

  const phraseFieldMatch = rawFields.some((field) => field!.includes(compactQuery));
  const shortContributorMatch = compactQuery.length < 4 && matchesContributorKeyword(emoji, compactQuery);

  if (rawFields.some((field) => compactMyanmarText(field!) === compactQuery)) {
    score += 3.0;
  } else if (
    shouldAllowBurmeseSubstringBoost(compactQuery) &&
    compactFields.some((field) => field.includes(compactQuery))
  ) {
    score += 1.1;
  } else if (shortContributorMatch) {
    // Short Burmese fragments are noisy, so only let contributed keywords recover
    // some of that recall instead of reopening broad substring matches globally.
    score += 0.8;
  }

  if (phraseFieldMatch) {
    score += 1.0;
  }

  if (matchesContributorKeyword(emoji, compactQuery)) {
    score += 2.3;
  }

  const primaryHits = analysis.segmentedTerms.filter((term) => hasBurmeseTermSupport(emoji, term));
  if (analysis.segmentedTerms.length > 0) {
    score += (primaryHits.length / analysis.segmentedTerms.length) * 2.0;
    if (primaryHits.length === analysis.segmentedTerms.length && analysis.segmentedTerms.length > 1) {
      score += 0.5;
    }
  }

  if (phraseFieldMatch && analysis.segmentedTerms.length > 1 && primaryHits.length > 0) {
    score += 0.6;
  }

  const contributedHits = analysis.segmentedTerms.filter((term) => matchesContributorKeyword(emoji, term));
  if (analysis.segmentedTerms.length > 0 && contributedHits.length > 0) {
    score += (contributedHits.length / analysis.segmentedTerms.length) * 1.3;
  }

  const expandedTerms = analysis.semanticViews.length > 1
    ? analysis.semanticViews[analysis.semanticViews.length - 1].text.split(/\s+/).filter(Boolean)
    : [];
  const expandedOnly = expandedTerms.filter((term) => !analysis.segmentedTerms.includes(term));
  const expandedHits = expandedOnly.filter((term) => hasBurmeseTermSupport(emoji, term));

  if (expandedOnly.length > 0) {
    score += (expandedHits.length / expandedOnly.length) * 0.45;
  }

  return score;
}

function semanticGate(lexicalScore: number, isBurmeseQuery: boolean): number {
  if (lexicalScore >= 1.6) return 1;
  if (lexicalScore >= 0.8) return 0.7;
  return isBurmeseQuery ? 0.25 : 0.45;
}

function collapseSkinToneResults(results: EmojiItem[], analysis: QueryAnalysis): EmojiItem[] {
  if (analysis.requestedSkinTones.length > 0) {
    return results.filter((emoji) => {
      if (!emoji.supportsSkinTonePicker) return true;
      return emoji.skinTone === 'default' || analysis.requestedSkinTones.includes(emoji.skinTone ?? 'default');
    });
  }

  const toneGroups = new Map<string, EmojiItem[]>();
  for (const emoji of results) {
    if (!emoji.supportsSkinTonePicker || !emoji.baseCodePoints) {
      continue;
    }

    const group = toneGroups.get(emoji.baseCodePoints) ?? [];
    group.push(emoji);
    toneGroups.set(emoji.baseCodePoints, group);
  }

  const seenGroups = new Set<string>();
  const collapsed: EmojiItem[] = [];

  for (const emoji of results) {
    if (!emoji.supportsSkinTonePicker || !emoji.baseCodePoints) {
      collapsed.push(emoji);
      continue;
    }

    if (seenGroups.has(emoji.baseCodePoints)) {
      continue;
    }

    seenGroups.add(emoji.baseCodePoints);
    const group = toneGroups.get(emoji.baseCodePoints) ?? [emoji];
    collapsed.push(group.find((candidate) => candidate.skinTone === 'default') ?? group[0]);
  }

  return collapsed;
}

export function rankEmojiResults(
  allEmojis: EmojiItem[],
  query: string,
  analysis: QueryAnalysis,
  semanticSignal?: SemanticSignal
): EmojiItem[] {
  const lowerQuery = query.toLowerCase().trim();
  const ranked = allEmojis
    .map((emoji) => {
      const lexicalScore = analysis.isBurmeseQuery
        ? scoreBurmeseLexical(emoji, analysis)
        : scoreEnglishLexical(emoji, lowerQuery, analysis.englishTokens);

      let score = lexicalScore;

      if (semanticSignal && emoji.embedding && emoji.embedding.length > 0) {
        const similarity = semanticSignal.scores.get(emoji.emoji) ?? 0;
        const semanticRange = Math.max(semanticSignal.ceiling - semanticSignal.floor, 1e-6);

        if (similarity > semanticSignal.floor) {
          const normalized = Math.min(
            1,
            Math.max(0, (similarity - semanticSignal.floor) / semanticRange)
          );

          score += normalized * 3.1 * semanticGate(lexicalScore, analysis.isBurmeseQuery);
        }
      }

      return { ...emoji, score };
    })
    .filter((emoji) => emoji.score > (analysis.isBurmeseQuery ? 0.35 : 0.25))
    .sort((a, b) => b.score! - a.score!);

  return collapseSkinToneResults(ranked, analysis).slice(0, 36);
}
