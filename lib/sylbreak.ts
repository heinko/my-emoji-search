/**
 * JavaScript implementation of Ye Kyaw Thu's original `sylbreak` (Syllable Segmentation).
 * Original Repository: https://github.com/ye-kyaw-thu/sylbreak
 * 
 * Segments Burmese text into syllables using regular expressions.
 */

const BURMESE_SYL_PATTERN = /((?:[က-အ](?:်|္[က-အ])?[\u102B-\u103E]*)|[၀-၉၊။]|[^\u1000-\u104F]+)/g;

export function sylbreak(text: string): string[] {
  if (!text) return [];
  
  // Clean potential zero-width spaces or hidden characters
  const cleanText = text.replace(/[\u200B\u200C\u200D]/g, '');
  
  const matches = cleanText.match(BURMESE_SYL_PATTERN);
  if (!matches) return [text];
  
  return matches.map(s => s.trim()).filter(Boolean);
}

/**
 * Normalizes Burmese text for searching by breaking syllables and joining with spaces.
 */
export function normalizeBurmese(text: string): string {
  return sylbreak(text).join(' ');
}
