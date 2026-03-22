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

export const locales = [
  { code: 'my', name: 'ဗမာ (Burmese)' },
  { code: 'en', name: 'English' },
];

export async function loadEmojiData(locale: string): Promise<EmojiItem[]> {
  try {
    const response = await fetch(`/data/emoji/emoji-index-${locale}.json`);
    if (!response.ok) throw new Error(`Failed to fetch emoji data: ${response.statusText}`);
    const data: EmojiItem[] = await response.json();
    
    // Pre-calculate syllables for Burmese locale once upon load to avoid
    // running expensive regex thousands of times per keystroke
    if (locale === 'my') {
      // Yield to main thread briefly before heavy work
      await new Promise(resolve => setTimeout(resolve, 0));
      
      for (const emoji of data) {
        if (emoji.myName) {
          emoji.syllables = Array.from(new Set([
            ...sylbreak(emoji.myName.toLowerCase()),
            ...(emoji.keywords || []).flatMap(k => sylbreak(k.toLowerCase()))
          ]));
        } else {
          emoji.syllables = [];
        }
      }
    }
    
    return data;
  } catch (error) {
    console.error(`Failed to load emoji data for locale: ${locale}`, error);
    return [];
  }
}
