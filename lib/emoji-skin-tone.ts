export type SkinToneId =
  | 'default'
  | 'light'
  | 'medium-light'
  | 'medium'
  | 'medium-dark'
  | 'dark'
  | 'mixed';

export interface SkinToneMetadata {
  baseCodePoints: string;
  isSkinToneVariant: boolean;
  skinTone: SkinToneId;
}

export interface SkinToneOption {
  emoji: string;
  tone: SkinToneId;
  displayName: string;
}

const SKIN_TONE_CODEPOINTS = new Map<string, SkinToneId>([
  ['1F3FB', 'light'],
  ['1F3FC', 'medium-light'],
  ['1F3FD', 'medium'],
  ['1F3FE', 'medium-dark'],
  ['1F3FF', 'dark'],
]);

const QUERY_TONE_TERMS: Array<{ tone: SkinToneId; terms: string[] }> = [
  { tone: 'light', terms: ['light skin tone', 'light skin', 'အသားဖြူရောင်'] },
  { tone: 'medium-light', terms: ['medium-light skin tone', 'medium light skin', 'အသားနုရောင်'] },
  { tone: 'medium', terms: ['medium skin tone', 'medium skin', 'အသားလတ်ရောင်'] },
  { tone: 'medium-dark', terms: ['medium-dark skin tone', 'medium dark skin', 'အသားညိုရောင်'] },
  { tone: 'dark', terms: ['dark skin tone', 'dark skin', 'အသားမည်းရောင်'] },
];

export const SKIN_TONE_ORDER: SkinToneId[] = [
  'default',
  'light',
  'medium-light',
  'medium',
  'medium-dark',
  'dark',
  'mixed',
];

export const SKIN_TONE_LABELS: Record<SkinToneId, string> = {
  default: 'Default',
  light: 'အသားဖြူရောင်',
  'medium-light': 'အသားနုရောင်',
  medium: 'အသားလတ်ရောင်',
  'medium-dark': 'အသားညိုရောင်',
  dark: 'အသားမည်းရောင်',
  mixed: 'Mixed',
};

export function getSkinToneMetadata(codePoints: string): SkinToneMetadata {
  const parts = codePoints.split('-').filter(Boolean);
  const modifiers = parts.filter((part) => SKIN_TONE_CODEPOINTS.has(part));
  const baseCodePoints = parts.filter((part) => !SKIN_TONE_CODEPOINTS.has(part)).join('-');

  if (modifiers.length === 0) {
    return {
      baseCodePoints,
      isSkinToneVariant: false,
      skinTone: 'default',
    };
  }

  const uniqueTones = Array.from(
    new Set(modifiers.map((modifier) => SKIN_TONE_CODEPOINTS.get(modifier)!))
  );

  return {
    baseCodePoints,
    isSkinToneVariant: true,
    skinTone: uniqueTones.length === 1 ? uniqueTones[0] : 'mixed',
  };
}

export function extractRequestedSkinTones(query: string): SkinToneId[] {
  const normalized = query.toLowerCase();
  const requested = QUERY_TONE_TERMS
    .filter(({ terms }) => terms.some((term) => normalized.includes(term)))
    .map(({ tone }) => tone);

  return Array.from(new Set(requested));
}

export function supportsAppleStyleSkinTonePicker(options: SkinToneOption[]): boolean {
  const optionTones = new Set(options.map((option) => option.tone));
  return (
    options.length >= 6 &&
    ['default', 'light', 'medium-light', 'medium', 'medium-dark', 'dark'].every((tone) =>
      optionTones.has(tone as SkinToneId)
    )
  );
}
