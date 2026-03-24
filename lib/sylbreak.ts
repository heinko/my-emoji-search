/**
 * TypeScript implementation of Ye Kyaw Thu's original `sylbreak` (Syllable Segmentation).
 * Original Repository: https://github.com/ye-kyaw-thu/sylbreak
 * 
 * Segments Burmese text into syllables using regular expressions.
 */

const myConsonant: string = "\u1000-\u1021"; // "က-အ"

const enChar: string = "a-zA-Z0-9";

// "ဣဤဥဦဧဩဪဿ၌၍၏၀-၉၊။!-/:-@[-`{-~\s"
const otherChar: string = "\u1023\u1024\u1025\u1026\u1027\u1029\u102a\u103f\u104c\u104d\u104f\u1040-\u1049\u104a\u104b!-/:-@\\[-`\\{-~\\s";

const ssSymbol: string = "\u1039";

const ngaThat: string = "\u1004\u103a";

const aThat: string = "\u103a";

// Regular expression pattern for Myanmar syllable breaking
// *** a consonant not after a subscript symbol AND a consonant is not
// followed by a-That character or a subscript symbol
export const MYANMAR_SYLLABLE_BREAK_PATTERN: RegExp = new RegExp("((?!" + ssSymbol + ")[" + myConsonant + "](?![" + aThat + ssSymbol + "])" + "|[" + enChar + otherChar + "])", "mg");

export class Sylbreak {
    
    static segment(unicode: string): string[] {
        if (!unicode) {
            return new Array();
        }

        var outArray = unicode.replace(MYANMAR_SYLLABLE_BREAK_PATTERN, "𝕊$1").split('𝕊');
        if (outArray.length > 0) {
            outArray.shift();
        }
        return outArray;
    }

    static segmentWithSeparator(unicode: string, separator: string): string {
        if (!unicode) {
            return "";
        }
        if (!separator) {
            separator = "|";
        }
        return unicode.replace(MYANMAR_SYLLABLE_BREAK_PATTERN, separator + "$1");
    }
}

export function sylbreak(text: string): string[] {
  if (!text) return [];
  
  // Clean potential zero-width spaces or hidden characters
  const cleanText = text.replace(/[\u200B\u200C\u200D]/g, '');
  
  const matches = Sylbreak.segment(cleanText);
  if (!matches || matches.length === 0) return [text];
  
  return matches.map(s => s.trim()).filter(Boolean);
}

/**
 * Normalizes Burmese text for searching by breaking syllables and joining with spaces.
 */
export function normalizeBurmese(text: string): string {
  return sylbreak(text).join(' ');
}
