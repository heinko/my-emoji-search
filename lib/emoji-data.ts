import { sylbreak } from './sylbreak';

export interface EmojiItem {
  emoji: string;
  codePoints: string;
  name: string;
  enName: string;
  myName: string;
  displayName: string;
  keywords: string[];
  group: string;
  subgroup: string;
  embedding?: number[];
  syllables?: string[];
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
      
      // Pre-calculate syllables once
      for (const emoji of rawData) {
        if (emoji.myName) {
          emoji.syllables = Array.from(new Set([
            ...sylbreak(emoji.myName.toLowerCase()),
            ...(emoji.keywords || []).flatMap(k => sylbreak(k.toLowerCase()))
          ]));
        } else {
          emoji.syllables = [];
        }
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
