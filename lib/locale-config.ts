export type SearchStrategy = 'burmese' | 'generic';

export interface LocaleConfig {
  id: string;
  label: string;
  cldrLocale: string;
  iso6393: string;
  iso6391?: string;
  placeholder: string;
  examples: string[];
  searchStrategy: SearchStrategy;
  semanticEnabled: boolean;
}

export interface RoadmapLocale {
  label: string;
  note: string;
  cldrLocale: string;
  iso6393: string;
  iso6391?: string;
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  {
    id: 'my',
    label: 'Burmese',
    cldrLocale: 'my',
    iso6393: 'mya',
    iso6391: 'my',
    placeholder: 'ဥပမာ - ပျော်ရွှင်',
    examples: ['ပင်လယ်ကမ်းခြေ', 'ငြိမ်းချမ်းရေး', 'အချစ်', 'တိရစ္ဆာန်'],
    searchStrategy: 'burmese',
    semanticEnabled: true,
  },
  {
    id: 'shn',
    label: 'Shan',
    cldrLocale: 'shn',
    iso6393: 'shn',
    placeholder: 'ၵူတ်ႇလီၵ်ႈ - ၼႃႈယုမ်ႉၶူဝ်',
    examples: ['ၼႃႈယုမ်ႉၶူဝ်', 'မႅဝ်း', 'ယုမ်ႉ', 'သတ်း'],
    searchStrategy: 'generic',
    semanticEnabled: false,
  },
  {
    id: 'en',
    label: 'English',
    cldrLocale: 'en',
    iso6393: 'eng',
    iso6391: 'en',
    placeholder: 'Example - happy',
    examples: ['heart', 'doctor', 'cat', 'party'],
    searchStrategy: 'generic',
    semanticEnabled: false,
  },
];

export const ROADMAP_LOCALES: RoadmapLocale[] = [
  { label: 'Pali', cldrLocale: 'pi', iso6393: 'pli', iso6391: 'pi', note: 'Not enabled until emoji annotations are available.' },
  { label: 'Mon', cldrLocale: 'mnw', iso6393: 'mnw', note: 'Not enabled until emoji annotations are available.' },
  { label: "S'gaw Karen", cldrLocale: 'ksw', iso6393: 'ksw', note: 'Not enabled until emoji annotations are available.' },
  { label: 'Pwo Karen', cldrLocale: 'pwo', iso6393: 'pwo', note: 'Not enabled until emoji annotations are available.' },
  { label: 'Jingpho (Kachin)', cldrLocale: 'kac', iso6393: 'kac', note: 'Not enabled until emoji annotations are available.' },
  { label: 'Rakhine', cldrLocale: 'rki', iso6393: 'rki', note: 'Not enabled until emoji annotations are available.' },
  { label: "Pa'O", cldrLocale: 'blk', iso6393: 'blk', note: 'Not enabled until emoji annotations are available.' },
  { label: 'Chin (Falam)', cldrLocale: 'cfm', iso6393: 'cfm', note: 'Not enabled until emoji annotations are available.' },
  { label: 'Chin (Tedim)', cldrLocale: 'ctd', iso6393: 'ctd', note: 'Not enabled until emoji annotations are available.' },
];

export const DEFAULT_LOCALE_ID = SUPPORTED_LOCALES[0].id;

export function getLocaleConfig(localeId: string): LocaleConfig {
  return SUPPORTED_LOCALES.find((locale) => locale.id === localeId) ?? SUPPORTED_LOCALES[0];
}
