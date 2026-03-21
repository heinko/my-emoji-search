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
}

export const locales = [
  { code: 'my', name: 'ဗမာ (Burmese)' },
  { code: 'en', name: 'English' },
];

export async function loadEmojiData(locale: string): Promise<EmojiItem[]> {
  try {
    const response = await fetch(`/data/emoji/emoji-index-${locale}.json`);
    if (!response.ok) throw new Error(`Failed to fetch emoji data: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to load emoji data for locale: ${locale}`, error);
    return [];
  }
}
