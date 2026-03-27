import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { parseStringPromise } from 'xml2js';
import { pipeline, env } from '@huggingface/transformers';
import { buildBurmeseSearchMetadata, buildEmojiSearchLexicon } from '../../lib/burmese-search';
import { SUPPORTED_LOCALES, type LocaleConfig } from '../../lib/locale-config';

env.allowLocalModels = false;
env.allowRemoteModels = true;

const MODEL_NAME = 'intfloat/multilingual-e5-small';

const UNICODE_VERSION = '17.0.0';
const EMOJI_TEST_URL = `https://www.unicode.org/Public/${UNICODE_VERSION}/emoji/emoji-test.txt`;
const CLDR_BASE_URL = 'https://raw.githubusercontent.com/unicode-org/cldr/main/common';
const CONTRIBUTOR_CATALOG_CSV_PATH = path.join(process.cwd(), 'data/dist/emoji-contributor-catalog.csv');
const BUILD_MANIFEST_PATH = path.join(process.cwd(), 'public/data/emoji/emoji-build-manifest.json');
const FORCE_FULL_REBUILD = process.argv.includes('--full');

interface EmojiEntry {
  emoji: string;
  codePoints: string;
  status: string;
  name: string;
  group: string;
  subgroup: string;
}

interface LocalizedEntry {
  name: string;
  keywords: string[];
}

interface ExtraKeywordsEntry {
  keywords: string[];
}

interface EmojiVectorEntry {
  codePoints: string;
  embedding: number[];
}

interface LocalizedEmojiEntry extends EmojiEntry {
  contributorKeywords: string[];
  englishKeywords: string[];
  localizedKeywords: string[];
  localizedName: string;
}

interface EmojiLexicalEntry {
  codePoints: string;
  contributorKeywords?: string[];
  displayName: string;
  emoji: string;
  enName: string;
  englishKeywords?: string[];
  group: string;
  localizedKeywords: string[];
  localizedName: string;
  subgroup: string;
  wordTokens: string[];
}

interface BuildManifest {
  generatedAt: string;
  modelName: string;
  unicodeVersion: string;
  entries: Record<string, { embeddingInputHash: string }>;
}

function escapeCsvValue(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function parseExtraKeywordsCsv(filePath: string): Record<string, ExtraKeywordsEntry> {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const data: Record<string, ExtraKeywordsEntry> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const cols = parseCsvLine(line);
    if (cols.length < 3) continue;

    const hex = cols[0].trim();
    const keywordColumn = cols.length >= 4 ? cols[3] : cols[2];
    const keywords = keywordColumn
      .split(/[,;]/)
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    if (!hex || keywords.length === 0) continue;
    data[hex] = { keywords };
  }

  return data;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function loadJsonIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function arraysEqual(left: string[] | undefined, right: string[] | undefined): boolean {
  const normalizedLeft = left ?? [];
  const normalizedRight = right ?? [];

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function canReuseExistingEmbedding(
  currentEntry: EmojiLexicalEntry,
  previousEntry: EmojiLexicalEntry | undefined
): boolean {
  if (!previousEntry) {
    return false;
  }

  return (
    currentEntry.codePoints === previousEntry.codePoints &&
    currentEntry.enName === previousEntry.enName &&
    currentEntry.localizedName === previousEntry.localizedName &&
    currentEntry.group === previousEntry.group &&
    currentEntry.subgroup === previousEntry.subgroup &&
    arraysEqual(currentEntry.localizedKeywords, previousEntry.localizedKeywords) &&
    arraysEqual(currentEntry.englishKeywords, previousEntry.englishKeywords) &&
    arraysEqual(currentEntry.wordTokens, previousEntry.wordTokens)
  );
}

function buildPassageText(
  locale: LocaleConfig,
  emoji: EmojiEntry,
  localizedName: string,
  localizedKeywords: string[],
  englishKeywords: string[],
  wordTokens: string[]
): string {
  const localizedKeywordText = localizedKeywords.length > 0 ? localizedKeywords.join(', ') : localizedName;
  const localizedTokenText = wordTokens.length > 0 ? wordTokens.join(', ') : localizedKeywordText;
  const englishKeywordText = englishKeywords.length > 0 ? englishKeywords.join(', ') : emoji.name;

  return [
    'passage:',
    `emoji ${emoji.emoji}.`,
    `${locale.label} name ${localizedName}.`,
    `${locale.label} terms ${localizedTokenText}.`,
    `English name ${emoji.name}.`,
    `English keywords ${englishKeywordText}.`,
    `Category ${emoji.group}.`,
    `Subcategory ${emoji.subgroup}.`,
  ].join(' ');
}

function writeContributorCatalogCsv(emojis: EmojiEntry[]) {
  const header = ['Hex', 'Emoji', 'English Name', 'Extra Keywords'];
  const rows = emojis.map((emoji) =>
    [emoji.codePoints, emoji.emoji, emoji.name, ''].map(escapeCsvValue).join(',')
  );

  fs.mkdirSync(path.dirname(CONTRIBUTOR_CATALOG_CSV_PATH), { recursive: true });
  fs.writeFileSync(CONTRIBUTOR_CATALOG_CSV_PATH, [header.join(','), ...rows].join('\n'));
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.text();
}

async function parseUnicodeEmojiTest(text: string): Promise<EmojiEntry[]> {
  const lines = text.split('\n');
  const emojis: EmojiEntry[] = [];
  let currentGroup = '';
  let currentSubgroup = '';

  for (const line of lines) {
    if (line.startsWith('# group:')) {
      currentGroup = line.replace('# group:', '').trim();
      continue;
    }

    if (line.startsWith('# subgroup:')) {
      currentSubgroup = line.replace('# subgroup:', '').trim();
      continue;
    }

    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([^;]+);([^#]+)# ([^ ]+) E([^ ]+) (.+)$/);
    if (match) {
      emojis.push({
        codePoints: match[1].trim().replace(/\s+/g, '-'),
        status: match[2].trim(),
        emoji: match[3].trim(),
        name: match[5].trim(),
        group: currentGroup,
        subgroup: currentSubgroup,
      });
    }
  }

  return emojis;
}

async function parseCLDRAnnotations(xmlText: string): Promise<Record<string, LocalizedEntry>> {
  const result = await parseStringPromise(xmlText);
  if (
    !result.ldml ||
    !result.ldml.annotations ||
    !result.ldml.annotations[0] ||
    !result.ldml.annotations[0].annotation
  ) {
    return {};
  }

  const annotations = result.ldml.annotations[0].annotation;
  const data: Record<string, LocalizedEntry> = {};

  for (const entry of annotations) {
    if (!entry.$ || !entry.$.cp) continue;
    const emoji = entry.$.cp;
    const type = entry.$.type;
    const value = entry._;
    if (!value) continue;

    if (!data[emoji]) data[emoji] = { name: '', keywords: [] };
    if (type === 'tts') data[emoji].name = value;
    else data[emoji].keywords = value.split('|').map((keyword: string) => keyword.trim());
  }

  return data;
}

function mergeAnnotations(
  target: Record<string, LocalizedEntry>,
  source: Record<string, LocalizedEntry>
) {
  for (const [emoji, entry] of Object.entries(source)) {
    if (!target[emoji]) {
      target[emoji] = entry;
      continue;
    }

    if (!target[emoji].name && entry.name) {
      target[emoji].name = entry.name;
    }

    target[emoji].keywords = Array.from(new Set([...target[emoji].keywords, ...entry.keywords]));
  }
}

async function fetchLocaleAnnotations(cldrLocale: string): Promise<Record<string, LocalizedEntry>> {
  const baseUrl = `${CLDR_BASE_URL}/annotations/${cldrLocale}.xml`;
  const derivedUrl = `${CLDR_BASE_URL}/annotationsDerived/${cldrLocale}.xml`;

  const baseAnnotations = await parseCLDRAnnotations(await fetchText(baseUrl));
  try {
    const derivedAnnotations = await parseCLDRAnnotations(await fetchText(derivedUrl));
    mergeAnnotations(baseAnnotations, derivedAnnotations);
  } catch (error) {
    console.warn(`Failed to fetch derived annotations for ${cldrLocale}, proceeding without them.`);
  }

  return baseAnnotations;
}

function getExtraKeywordsFilePath(locale: LocaleConfig): string {
  return path.join(process.cwd(), `data/locales/${locale.id}-extra-keywords.csv`);
}

function getIndexFilePath(locale: LocaleConfig): string {
  return path.join(process.cwd(), `public/data/emoji/emoji-index-${locale.id}.json`);
}

function getVectorFilePath(locale: LocaleConfig): string {
  return path.join(process.cwd(), `public/data/emoji/emoji-vectors-${locale.id}.json`);
}

function getManifestEntryKey(localeId: string, codePoints: string): string {
  return `${localeId}:${codePoints}`;
}

async function main() {
  try {
    console.log(`Fetching Unicode ${UNICODE_VERSION} emoji list...`);
    const emojiText = await fetchText(EMOJI_TEST_URL);
    console.log('Fetching English CLDR annotations...');
    const englishAnnotations = await fetchLocaleAnnotations('en');

    const localeAnnotations = new Map<string, Record<string, LocalizedEntry>>();
    localeAnnotations.set('en', englishAnnotations);

    for (const locale of SUPPORTED_LOCALES) {
      if (locale.id === 'en') continue;
      console.log(`Fetching ${locale.label} CLDR annotations...`);
      localeAnnotations.set(locale.id, await fetchLocaleAnnotations(locale.cldrLocale));
    }

    const baseEmojis = await parseUnicodeEmojiTest(emojiText);
    const qualifiedEmojis = baseEmojis.filter((base) => base.status === 'fully-qualified');
    writeContributorCatalogCsv(qualifiedEmojis);

    const existingManifest = loadJsonIfExists<BuildManifest>(BUILD_MANIFEST_PATH);
    const previousManifestEntries =
      existingManifest?.modelName === MODEL_NAME && existingManifest?.unicodeVersion === UNICODE_VERSION
        ? existingManifest.entries
        : undefined;

    const createExtractor = pipeline as unknown as (
      task: 'feature-extraction',
      model: string
    ) => Promise<{
      (text: string, options: { pooling: 'mean'; normalize: true }): Promise<{ data: Iterable<number> }>;
    }>;
    let extractorPromise: Promise<{
      (text: string, options: { pooling: 'mean'; normalize: true }): Promise<{ data: Iterable<number> }>;
    }> | null = null;

    async function getExtractor() {
      if (!extractorPromise) {
        console.log('Loading transformer pipeline... this may take a moment to drop the model locally.');
        extractorPromise = createExtractor('feature-extraction', MODEL_NAME);
      }

      return extractorPromise;
    }

    const manifestEntries: BuildManifest['entries'] = {};
    const semanticLocales = SUPPORTED_LOCALES.filter((locale) => locale.semanticEnabled);
    let reusedCount = 0;
    let regeneratedCount = 0;

    for (const locale of SUPPORTED_LOCALES) {
      const localizedAnnotations = localeAnnotations.get(locale.id) ?? {};
      const extraKeywords = parseExtraKeywordsCsv(getExtraKeywordsFilePath(locale));
      const existingLexicalData =
        loadJsonIfExists<EmojiLexicalEntry[]>(getIndexFilePath(locale)) ?? [];
      const previousLexicalByCodePoints = new Map(
        existingLexicalData.map((entry) => [entry.codePoints, entry])
      );
      const existingVectorData =
        locale.semanticEnabled
          ? loadJsonIfExists<EmojiVectorEntry[]>(getVectorFilePath(locale)) ?? []
          : [];
      const previousVectorsByCodePoints = new Map(
        existingVectorData.map((entry) => [entry.codePoints, entry.embedding])
      );

      const localizedEmojis: LocalizedEmojiEntry[] = qualifiedEmojis.map((base) => {
        const annotation = localizedAnnotations[base.emoji] || { name: '', keywords: [] };
        const contributed = extraKeywords[base.codePoints]?.keywords || [];
        const englishKeywords = Array.from(
          new Set(
            (englishAnnotations[base.emoji]?.keywords ?? [])
              .map((keyword) => keyword.trim())
              .filter((keyword) => keyword && keyword.toLowerCase() !== base.name.toLowerCase())
          )
        );
        const localizedName = annotation.name || base.name;
        const localizedKeywords = Array.from(new Set([...annotation.keywords, ...contributed]));

        return {
          ...base,
          contributorKeywords: contributed,
          englishKeywords,
          localizedKeywords,
          localizedName,
        };
      });

      const searchLexicon =
        locale.searchStrategy === 'burmese'
          ? buildEmojiSearchLexicon(localizedEmojis)
          : null;

      console.log(`Generating ${locale.label} index (${localizedEmojis.length} emojis)...`);
      const lexicalData: EmojiLexicalEntry[] = [];
      const vectorData: EmojiVectorEntry[] = [];
      let count = 0;

      for (const base of localizedEmojis) {
        if (++count % 500 === 0) {
          console.log(`[${locale.id}] Processed ${count}/${localizedEmojis.length}...`);
        }

        const metadata =
          locale.searchStrategy === 'burmese' && searchLexicon
            ? buildBurmeseSearchMetadata(base.localizedName, base.localizedKeywords, searchLexicon)
            : { wordTokens: [] };
        const lexicalEntry: EmojiLexicalEntry = {
          emoji: base.emoji,
          codePoints: base.codePoints,
          contributorKeywords: base.contributorKeywords,
          displayName: base.localizedName,
          enName: base.name,
          englishKeywords: base.englishKeywords,
          group: base.group,
          localizedKeywords: base.localizedKeywords,
          localizedName: base.localizedName,
          subgroup: base.subgroup,
          wordTokens: metadata.wordTokens,
        };

        lexicalData.push(lexicalEntry);

        if (!locale.semanticEnabled) {
          continue;
        }

        const textToEmbed = buildPassageText(
          locale,
          base,
          base.localizedName,
          base.localizedKeywords,
          base.englishKeywords,
          metadata.wordTokens
        );
        const embeddingInputHash = sha256(textToEmbed);
        const previousLexicalEntry = previousLexicalByCodePoints.get(base.codePoints);
        const previousEmbedding = previousVectorsByCodePoints.get(base.codePoints);
        const previousHash =
          previousManifestEntries?.[getManifestEntryKey(locale.id, base.codePoints)]?.embeddingInputHash;

        let embedding: number[];
        const canReuseFromManifest =
          !FORCE_FULL_REBUILD && previousEmbedding && previousHash === embeddingInputHash;
        const canReuseFromLexicalMatch =
          !FORCE_FULL_REBUILD &&
          previousEmbedding &&
          !previousHash &&
          canReuseExistingEmbedding(lexicalEntry, previousLexicalEntry);

        if (canReuseFromManifest || canReuseFromLexicalMatch) {
          embedding = previousEmbedding;
          reusedCount++;
        } else {
          const extractor = await getExtractor();
          const output = (await extractor(textToEmbed, {
            pooling: 'mean',
            normalize: true,
          })) as { data: Iterable<number> };
          embedding = Array.from(output.data);
          regeneratedCount++;
        }

        manifestEntries[getManifestEntryKey(locale.id, base.codePoints)] = { embeddingInputHash };
        vectorData.push({
          codePoints: base.codePoints,
          embedding,
        });
      }

      fs.writeFileSync(getIndexFilePath(locale), JSON.stringify(lexicalData));
      if (locale.semanticEnabled) {
        fs.writeFileSync(getVectorFilePath(locale), JSON.stringify(vectorData));
      }
    }

    fs.writeFileSync(
      BUILD_MANIFEST_PATH,
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        modelName: MODEL_NAME,
        unicodeVersion: UNICODE_VERSION,
        entries: manifestEntries,
      } satisfies BuildManifest)
    );

    console.log('Done! Indices rebuilt.');
    console.log(`Supported locales: ${SUPPORTED_LOCALES.map((locale) => locale.id).join(', ')}`);
    console.log(`Semantic locales: ${semanticLocales.map((locale) => locale.id).join(', ')}`);
    console.log(`Embeddings reused: ${reusedCount}`);
    console.log(`Embeddings regenerated: ${regeneratedCount}`);
    console.log(`Mode: ${FORCE_FULL_REBUILD ? 'full rebuild' : 'incremental rebuild'}`);
    console.log(`Contributor catalog written to ${CONTRIBUTOR_CATALOG_CSV_PATH}`);
  } catch (error) {
    console.error('Error generating data:', error);
    process.exit(1);
  }
}

main();
