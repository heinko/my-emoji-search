import { buildBurmeseSearchMetadata, buildEmojiSearchLexicon } from './burmese-search';
import { getSkinToneMetadata, type SkinToneId } from './emoji-skin-tone';
import { sylbreak } from './sylbreak';

export interface EmojiItem {
  emoji: string;
  codePoints: string;
  contributorKeywords?: string[];
  englishKeywords?: string[];
  name: string;
  enName: string;
  myName: string;
  displayName: string;
  keywords: string[];
  group: string;
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

// Cache the lexical dataset in memory so we don't re-parse it repeatedly.
let cachedEmojiData: EmojiItem[] | null = null;
let cachedEmojiEmbeddingMap: Map<string, number[]> | null = null;
let cachedEmojiEmbeddingPromise: Promise<Map<string, number[]>> | null = null;

export async function loadEmojiData(): Promise<EmojiItem[]> {
  try {
    let rawData: EmojiItem[];
    
    if (cachedEmojiData) {
      rawData = JSON.parse(JSON.stringify(cachedEmojiData)); // deep copy to allow modifications
    } else {
      // Fetch the Burmese lexical index. Semantic embeddings live in a separate file
      // so the default browser load stays smaller unless semantic mode is enabled.
      const response = await fetch(`/data/emoji/emoji-index-my.json`);
      if (!response.ok) throw new Error(`Failed to fetch emoji data: ${response.statusText}`);
      rawData = await response.json();
      
      // Yield to main thread briefly before heavy work
      await new Promise(resolve => setTimeout(resolve, 0));

      const needsSearchEnrichment = rawData.some(
        (emoji) => !emoji.wordTokens?.length
      );
      const lexicon = needsSearchEnrichment ? buildEmojiSearchLexicon(rawData) : null;
      
      // Pre-calculate search helpers once
      for (const emoji of rawData) {
        const skinToneMetadata = getSkinToneMetadata(emoji.codePoints);
        emoji.baseCodePoints = skinToneMetadata.baseCodePoints;
        emoji.isSkinToneVariant = skinToneMetadata.isSkinToneVariant;
        emoji.skinTone = skinToneMetadata.skinTone;

        if (lexicon && !emoji.wordTokens?.length) {
          const metadata = buildBurmeseSearchMetadata(
            emoji.myName ?? '',
            emoji.keywords ?? [],
            lexicon
          );
          emoji.wordTokens = metadata.wordTokens;
        }

        emoji.enTokens = tokenizeEnglish(
          [emoji.enName, ...(emoji.englishKeywords ?? []), emoji.group, emoji.subgroup]
            .filter(Boolean)
            .join(' ')
        );

        if (emoji.myName) {
          emoji.syllables = Array.from(new Set([
            ...(emoji.wordTokens ?? []),
            ...sylbreak(emoji.myName.toLowerCase()),
            ...(emoji.keywords || []).flatMap(k => sylbreak(k.toLowerCase()))
          ]));
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
        emoji.supportsSkinTonePicker = (skinToneGroupCounts.get(emoji.baseCodePoints ?? '') ?? 0) > 1;
      }
      
      cachedEmojiData = rawData;
      // Re-copy since we just mutated rawData
      rawData = JSON.parse(JSON.stringify(cachedEmojiData));
    }
    
    // Set the display name
    for (const emoji of rawData) {
      emoji.displayName = emoji.myName || emoji.enName;
    }
    
    return rawData;
  } catch (error) {
    console.error(`Failed to load emoji data`, error);
    return [];
  }
}

export async function loadEmojiEmbeddings(): Promise<Map<string, number[]>> {
  if (cachedEmojiEmbeddingMap) {
    return new Map(cachedEmojiEmbeddingMap);
  }

  if (cachedEmojiEmbeddingPromise) {
    return cachedEmojiEmbeddingPromise.then((embeddingMap) => new Map(embeddingMap));
  }

  cachedEmojiEmbeddingPromise = (async () => {
    const response = await fetch(`/data/emoji/emoji-vectors-my.json`);
    if (!response.ok) throw new Error(`Failed to fetch emoji vectors: ${response.statusText}`);

    const rawData = (await response.json()) as EmojiVectorEntry[];
    cachedEmojiEmbeddingMap = new Map(
      rawData
        .filter((entry) => entry.codePoints && Array.isArray(entry.embedding))
        .map((entry) => [entry.codePoints, entry.embedding])
    );

    return cachedEmojiEmbeddingMap;
  })();

  try {
    const embeddingMap = await cachedEmojiEmbeddingPromise;
    return new Map(embeddingMap);
  } finally {
    cachedEmojiEmbeddingPromise = null;
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
