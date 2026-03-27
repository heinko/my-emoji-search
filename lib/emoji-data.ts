import { buildBurmeseSearchMetadata, buildEmojiSearchLexicon } from './burmese-search';
import { getSkinToneMetadata, type SkinToneId } from './emoji-skin-tone';
import { getLocaleConfig } from './locale-config';
import { sylbreak } from './sylbreak';

export interface EmojiItem {
  emoji: string;
  codePoints: string;
  contributorKeywords?: string[];
  displayName: string;
  enName: string;
  englishKeywords?: string[];
  group: string;
  localizedKeywords: string[];
  localizedName: string;
  localizedTokens?: string[];
  subgroup: string;
  embedding?: number[];
  enTokens?: string[];
  syllables?: string[];
  baseCodePoints?: string;
  isSkinToneVariant?: boolean;
  skinTone?: SkinToneId;
  supportsSkinTonePicker?: boolean;
  wordTokens?: string[];
}

export interface EmojiVectorEntry {
  codePoints: string;
  embedding: number[];
}

function normalizeEnglishSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b(?:[a-z]\.){2,}[a-z]?\.?/g, (match) => match.replace(/\./g, ''))
    .replace(/&/g, ' and ')
    .replace(/[_-]+/g, ' ');
}

function stemEnglishToken(token: string): string {
  if (token.length <= 3) return token;

  if (token.endsWith('ied') && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith('ies') && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith('ing') && token.length > 5) {
    const stem = token.slice(0, -3);
    return /(.)\1$/.test(stem) ? stem.slice(0, -1) : stem;
  }

  if (token.endsWith('ed') && token.length > 4) {
    const stem = token.slice(0, -2);
    return /(.)\1$/.test(stem) ? stem.slice(0, -1) : stem;
  }

  if (token.endsWith('es') && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith('s') && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

function tokenizeEnglish(text: string): string[] {
  const normalized = normalizeEnglishSearchText(text);
  const baseTokens = normalized.match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
  const expandedTokens = baseTokens.flatMap((token) => {
    const stemmed = stemEnglishToken(token);
    return stemmed === token ? [token] : [token, stemmed];
  });

  return Array.from(new Set(expandedTokens)).filter(Boolean);
}

const cachedEmojiData = new Map<string, EmojiItem[]>();
const cachedEmojiEmbeddingMaps = new Map<string, Map<string, number[]>>();
const cachedEmojiEmbeddingPromises = new Map<string, Promise<Map<string, number[]>>>();

export async function loadEmojiData(localeId: string): Promise<EmojiItem[]> {
  const localeConfig = getLocaleConfig(localeId);

  try {
    let rawData: EmojiItem[];

    if (cachedEmojiData.has(localeId)) {
      rawData = JSON.parse(JSON.stringify(cachedEmojiData.get(localeId)));
    } else {
      const response = await fetch(`/data/emoji/emoji-index-${localeId}.json`);
      if (!response.ok) throw new Error(`Failed to fetch emoji data: ${response.statusText}`);
      rawData = await response.json();

      await new Promise((resolve) => setTimeout(resolve, 0));

      const needsSearchEnrichment =
        localeConfig.searchStrategy === 'burmese' &&
        rawData.some((emoji) => !emoji.wordTokens?.length);
      const lexicon =
        localeConfig.searchStrategy === 'burmese' && needsSearchEnrichment
          ? buildEmojiSearchLexicon(rawData)
          : null;

      for (const emoji of rawData) {
        const skinToneMetadata = getSkinToneMetadata(emoji.codePoints);
        emoji.baseCodePoints = skinToneMetadata.baseCodePoints;
        emoji.isSkinToneVariant = skinToneMetadata.isSkinToneVariant;
        emoji.skinTone = skinToneMetadata.skinTone;

        if (lexicon && !emoji.wordTokens?.length) {
          const metadata = buildBurmeseSearchMetadata(
            emoji.localizedName ?? '',
            emoji.localizedKeywords ?? [],
            lexicon
          );
          emoji.wordTokens = metadata.wordTokens;
        }

        emoji.enTokens = tokenizeEnglish(
          [emoji.enName, ...(emoji.englishKeywords ?? []), emoji.group, emoji.subgroup]
            .filter(Boolean)
            .join(' ')
        );
        emoji.localizedTokens = tokenizeEnglish(
          [emoji.localizedName, ...(emoji.localizedKeywords ?? []), ...(emoji.contributorKeywords ?? [])]
            .filter(Boolean)
            .join(' ')
        );

        if (localeConfig.searchStrategy === 'burmese' && emoji.localizedName) {
          emoji.syllables = Array.from(
            new Set([
              ...(emoji.wordTokens ?? []),
              ...sylbreak(emoji.localizedName.toLowerCase()),
              ...emoji.localizedKeywords.flatMap((keyword) => sylbreak(keyword.toLowerCase())),
            ])
          );
        } else {
          emoji.syllables = [];
        }
      }

      const skinToneGroupCounts = new Map<string, number>();
      for (const emoji of rawData) {
        if (!emoji.baseCodePoints) continue;
        skinToneGroupCounts.set(
          emoji.baseCodePoints,
          (skinToneGroupCounts.get(emoji.baseCodePoints) ?? 0) + 1
        );
      }

      for (const emoji of rawData) {
        emoji.supportsSkinTonePicker =
          (skinToneGroupCounts.get(emoji.baseCodePoints ?? '') ?? 0) > 1;
      }

      cachedEmojiData.set(localeId, rawData);
      rawData = JSON.parse(JSON.stringify(cachedEmojiData.get(localeId)));
    }

    for (const emoji of rawData) {
      emoji.displayName = emoji.localizedName || emoji.enName;
    }

    return rawData;
  } catch (error) {
    console.error('Failed to load emoji data', error);
    return [];
  }
}

export async function loadEmojiEmbeddings(localeId: string): Promise<Map<string, number[]>> {
  const localeConfig = getLocaleConfig(localeId);
  if (!localeConfig.semanticEnabled) {
    return new Map();
  }

  const cachedMap = cachedEmojiEmbeddingMaps.get(localeId);
  if (cachedMap) {
    return new Map(cachedMap);
  }

  const cachedPromise = cachedEmojiEmbeddingPromises.get(localeId);
  if (cachedPromise) {
    return cachedPromise.then((embeddingMap) => new Map(embeddingMap));
  }

  const promise = (async () => {
    const response = await fetch(`/data/emoji/emoji-vectors-${localeId}.json`);
    if (!response.ok) throw new Error(`Failed to fetch emoji vectors: ${response.statusText}`);

    const rawData = (await response.json()) as EmojiVectorEntry[];
    const embeddingMap = new Map(
      rawData
        .filter((entry) => entry.codePoints && Array.isArray(entry.embedding))
        .map((entry) => [entry.codePoints, entry.embedding])
    );
    cachedEmojiEmbeddingMaps.set(localeId, embeddingMap);
    return embeddingMap;
  })();

  cachedEmojiEmbeddingPromises.set(localeId, promise);

  try {
    const embeddingMap = await promise;
    return new Map(embeddingMap);
  } finally {
    cachedEmojiEmbeddingPromises.delete(localeId);
  }
}

export function mergeEmojiEmbeddings(
  emojis: EmojiItem[],
  embeddingMap: Map<string, number[]>
): EmojiItem[] {
  return emojis.map((emoji) => ({
    ...emoji,
    embedding: embeddingMap.get(emoji.codePoints),
  }));
}
