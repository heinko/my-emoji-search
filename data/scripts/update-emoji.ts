import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { parseStringPromise } from 'xml2js';
import { pipeline, env } from '@huggingface/transformers';
import { buildBurmeseSearchMetadata, buildEmojiSearchLexicon } from '../../lib/burmese-search';

env.allowLocalModels = false;
env.allowRemoteModels = true;

const MODEL_NAME = 'intfloat/multilingual-e5-small';

const UNICODE_VERSION = '16.0';
const EMOJI_TEST_URL = `https://unicode.org/Public/emoji/${UNICODE_VERSION}/emoji-test.txt`;
const CLDR_MY_URL = 'https://raw.githubusercontent.com/unicode-org/cldr/main/common/annotations/my.xml';
const CLDR_MY_DERIVED_URL = 'https://raw.githubusercontent.com/unicode-org/cldr/main/common/annotationsDerived/my.xml';

const EXTRA_KEYWORDS_CSV_PATH = path.join(process.cwd(), 'data/locales/my-extra-keywords.csv');
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

interface EmojiLexicalEntry {
  codePoints: string;
  contributorKeywords?: string[];
  displayName: string;
  emoji: string;
  enName: string;
  group: string;
  keywords: string[];
  myName: string;
  searchTextMy: string;
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

function buildPassageText(
  emoji: EmojiEntry,
  myName: string,
  myKeywords: string[],
  searchTextMy: string,
  wordTokens: string[]
): string {
  const keywordText = myKeywords.length > 0 ? myKeywords.join(', ') : emoji.name;
  return [
    'passage:',
    `emoji ${emoji.emoji}.`,
    `Burmese name ${myName}.`,
    `Burmese search text ${searchTextMy}.`,
    `Burmese tokens ${wordTokens.join(', ')}.`,
    `English name ${emoji.name}.`,
    `Keywords ${keywordText}.`,
    `Category ${emoji.group}.`,
    `Subcategory ${emoji.subgroup}.`,
  ].join(' ');
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
    // Support both the current 4-column catalog format
    // (Hex, Emoji, English Name, Extra Keywords)
    // and older 3-column variants where keywords were the last column.
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
    currentEntry.myName === previousEntry.myName &&
    currentEntry.group === previousEntry.group &&
    currentEntry.subgroup === previousEntry.subgroup &&
    currentEntry.searchTextMy === previousEntry.searchTextMy &&
    arraysEqual(currentEntry.keywords, previousEntry.keywords) &&
    arraysEqual(currentEntry.wordTokens, previousEntry.wordTokens)
  );
}

function writeContributorCatalogCsv(emojis: EmojiEntry[]) {
  const header = ['Hex', 'Emoji', 'English Name', 'Extra Keywords'];
  const rows = emojis.map((emoji) =>
    [
      emoji.codePoints,
      emoji.emoji,
      emoji.name,
      '',
    ]
      .map(escapeCsvValue)
      .join(',')
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
  if (!result.ldml || !result.ldml.annotations || !result.ldml.annotations[0] || !result.ldml.annotations[0].annotation) {
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
    else data[emoji].keywords = value.split('|').map((k: string) => k.trim());
  }
  return data;
}

async function main() {
  try {
    console.log(`Fetching Unicode ${UNICODE_VERSION} emoji list...`);
    const emojiText = await fetchText(EMOJI_TEST_URL);
    console.log(`Fetching CLDR Myanmar annotations...`);
    const cldrXml = await fetchText(CLDR_MY_URL);
    let cldrDerivedXml = '';
    try {
      console.log(`Fetching CLDR derived Myanmar annotations...`);
      cldrDerivedXml = await fetchText(CLDR_MY_DERIVED_URL);
    } catch (err) {
      console.warn('Failed to fetch derived annotations, proceeding without them.');
    }

    const baseEmojis = await parseUnicodeEmojiTest(emojiText);
    const burmeseAnnotations = await parseCLDRAnnotations(cldrXml);
    let burmeseDerivedAnnotations: Record<string, LocalizedEntry> = {};
    if (cldrDerivedXml) {
       burmeseDerivedAnnotations = await parseCLDRAnnotations(cldrDerivedXml);
    }
    
    // Merge annotations
    for (const [emoji, entry] of Object.entries(burmeseDerivedAnnotations)) {
      if (!burmeseAnnotations[emoji]) {
        burmeseAnnotations[emoji] = entry;
      } else {
        if (!burmeseAnnotations[emoji].name && entry.name) {
          burmeseAnnotations[emoji].name = entry.name;
        }
        burmeseAnnotations[emoji].keywords = Array.from(new Set([...burmeseAnnotations[emoji].keywords, ...entry.keywords]));
      }
    }

    const extraKeywordsMy = parseExtraKeywordsCsv(EXTRA_KEYWORDS_CSV_PATH);
    const existingLexicalData = loadJsonIfExists<EmojiLexicalEntry[]>(
      path.join(process.cwd(), 'public/data/emoji/emoji-index-my.json')
    ) ?? [];
    const existingVectorData = loadJsonIfExists<EmojiVectorEntry[]>(
      path.join(process.cwd(), 'public/data/emoji/emoji-vectors-my.json')
    ) ?? [];
    const existingManifest = loadJsonIfExists<BuildManifest>(BUILD_MANIFEST_PATH);

    const previousLexicalByCodePoints = new Map(
      existingLexicalData.map((entry) => [entry.codePoints, entry])
    );
    const previousVectorsByCodePoints = new Map(
      existingVectorData.map((entry) => [entry.codePoints, entry.embedding])
    );
    const previousManifestEntries =
      existingManifest?.modelName === MODEL_NAME &&
      existingManifest?.unicodeVersion === UNICODE_VERSION
        ? existingManifest.entries
        : undefined;

    let extractorPromise: ReturnType<typeof pipeline> | null = null;
    async function getExtractor() {
      if (!extractorPromise) {
        console.log(`Loading transformer pipeline... this may take a moment to drop the model locally.`);
        extractorPromise = pipeline('feature-extraction', MODEL_NAME);
      }

      return extractorPromise;
    }

    const qualifiedEmojis = baseEmojis.filter(base => base.status === 'fully-qualified');
    writeContributorCatalogCsv(qualifiedEmojis);
    const localizedEmojis = qualifiedEmojis.map((base) => {
      const myLocalized = burmeseAnnotations[base.emoji] || { name: '', keywords: [] };
      const contributed = extraKeywordsMy[base.codePoints]?.keywords || [];
      const myName = myLocalized.name || base.name;
      const myKeywords = Array.from(
        new Set([...myLocalized.keywords, ...contributed])
      );

      return {
        ...base,
        contributorKeywords: contributed,
        myKeywords,
        myName,
      };
    });
    const searchLexicon = buildEmojiSearchLexicon(localizedEmojis);

    console.log(`Generating Burmese index (${localizedEmojis.length} emojis)...`);
    const myData: EmojiLexicalEntry[] = [];
    const vectorData: EmojiVectorEntry[] = [];
    const manifestEntries: BuildManifest['entries'] = {};
    let count = 0;
    let reusedCount = 0;
    let regeneratedCount = 0;

    for (const base of localizedEmojis) {
      if (++count % 500 === 0) console.log(`Processed ${count}/${localizedEmojis.length}...`);

      const metadata = buildBurmeseSearchMetadata(base.myName, base.myKeywords, searchLexicon);
      const lexicalEntry: EmojiLexicalEntry = {
        emoji: base.emoji,
        codePoints: base.codePoints,
        enName: base.name,
        myName: base.myName,
        displayName: base.myName,
        keywords: base.myKeywords,
        group: base.group,
        subgroup: base.subgroup,
        contributorKeywords: base.contributorKeywords,
        searchTextMy: metadata.searchTextMy,
        wordTokens: metadata.wordTokens,
      };
      const textToEmbed = buildPassageText(
        base,
        base.myName,
        base.myKeywords,
        metadata.searchTextMy,
        metadata.wordTokens
      );
      const embeddingInputHash = sha256(textToEmbed);
      const previousLexicalEntry = previousLexicalByCodePoints.get(base.codePoints);
      const previousEmbedding = previousVectorsByCodePoints.get(base.codePoints);
      const previousHash = previousManifestEntries?.[base.codePoints]?.embeddingInputHash;

      let embedding: number[];
      const canReuseFromManifest =
        !FORCE_FULL_REBUILD &&
        previousEmbedding &&
        previousHash === embeddingInputHash;
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
        const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
        embedding = Array.from(output.data) as number[];
        regeneratedCount++;
      }

      manifestEntries[base.codePoints] = { embeddingInputHash };
      myData.push(lexicalEntry);

      vectorData.push({
        codePoints: base.codePoints,
        embedding,
      });
    }
    fs.writeFileSync(path.join(process.cwd(), 'public/data/emoji/emoji-index-my.json'), JSON.stringify(myData));
    fs.writeFileSync(path.join(process.cwd(), 'public/data/emoji/emoji-vectors-my.json'), JSON.stringify(vectorData));
    fs.writeFileSync(
      BUILD_MANIFEST_PATH,
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        modelName: MODEL_NAME,
        unicodeVersion: UNICODE_VERSION,
        entries: manifestEntries,
      } satisfies BuildManifest)
    );

    const enData = qualifiedEmojis.map(base => ({
      emoji: base.emoji,
      codePoints: base.codePoints,
      enName: base.name,
      displayName: base.name,
      keywords: [],
      group: base.group,
      subgroup: base.subgroup
    }));
    fs.writeFileSync(path.join(process.cwd(), 'public/data/emoji/emoji-index-en.json'), JSON.stringify(enData));

    console.log(`Done! Indices rebuilt.`);
    console.log(`Embeddings reused: ${reusedCount}`);
    console.log(`Embeddings regenerated: ${regeneratedCount}`);
    if (FORCE_FULL_REBUILD) {
      console.log(`Mode: full rebuild`);
    } else {
      console.log(`Mode: incremental rebuild`);
    }
    console.log(`Contributor catalog written to ${CONTRIBUTOR_CATALOG_CSV_PATH}`);
  } catch (error) {
    console.error('Error generating data:', error);
    process.exit(1);
  }
}

main();
