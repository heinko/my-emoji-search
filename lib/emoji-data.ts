import { buildBurmeseSearchMetadata, buildEmojiSearchLexicon } from './burmese-search';
import { getSkinToneMetadata, type SkinToneId } from './emoji-skin-tone';
import { sylbreak } from './sylbreak';

export interface EmojiItem {
  emoji: string;
  codePoints: string;
  contributorKeywords?: string[];
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
  searchTextMy?: string;
  baseCodePoints?: string;
  isSkinToneVariant?: boolean;
  skinTone?: SkinToneId;
  supportsSkinTonePicker?: boolean;
  wordTokens?: string[];
}

function tokenizeEnglish(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? []).filter(Boolean);
}

// Cache the data in memory so we don't re-parse 31MB repeatedly when switching locales
let cachedEmojiData: EmojiItem[] | null = null;

export async function loadEmojiData(): Promise<EmojiItem[]> {
  try {
    let rawData: EmojiItem[];
    
    if (cachedEmojiData) {
      rawData = JSON.parse(JSON.stringify(cachedEmojiData)); // deep copy to allow modifications
    } else {
      // Always fetch the 'my' index because it contains the 384d semantic embeddings 
      // and both enName and myName. The en-only index lacks embeddings and myanmar context.
      const response = await fetch(`/data/emoji/emoji-index-my.json`);
      if (!response.ok) throw new Error(`Failed to fetch emoji data: ${response.statusText}`);
      rawData = await response.json();
      
      // Yield to main thread briefly before heavy work
      await new Promise(resolve => setTimeout(resolve, 0));

      const needsSearchEnrichment = rawData.some(
        (emoji) => !emoji.wordTokens?.length || !emoji.searchTextMy
      );
      const lexicon = needsSearchEnrichment ? buildEmojiSearchLexicon(rawData) : null;
      
      // Pre-calculate search helpers once
      for (const emoji of rawData) {
        const skinToneMetadata = getSkinToneMetadata(emoji.codePoints);
        emoji.baseCodePoints = skinToneMetadata.baseCodePoints;
        emoji.isSkinToneVariant = skinToneMetadata.isSkinToneVariant;
        emoji.skinTone = skinToneMetadata.skinTone;

        if (lexicon && (!emoji.wordTokens?.length || !emoji.searchTextMy)) {
          const metadata = buildBurmeseSearchMetadata(
            emoji.myName ?? '',
            emoji.keywords ?? [],
            lexicon
          );
          emoji.wordTokens = metadata.wordTokens;
          emoji.searchTextMy = metadata.searchTextMy;
        }

        emoji.enTokens = tokenizeEnglish(
          [emoji.enName, emoji.group, emoji.subgroup].filter(Boolean).join(' ')
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
