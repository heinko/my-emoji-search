import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.allowRemoteModels = true;

const MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

const UNICODE_VERSION = '16.0';
const EMOJI_TEST_URL = `https://unicode.org/Public/emoji/${UNICODE_VERSION}/emoji-test.txt`;
const CLDR_MY_URL = 'https://raw.githubusercontent.com/unicode-org/cldr/main/common/annotations/my.xml';
const CLDR_MY_DERIVED_URL = 'https://raw.githubusercontent.com/unicode-org/cldr/main/common/annotationsDerived/my.xml';

const CUSTOM_CSV_PATH = path.join(process.cwd(), 'data/locales/my.csv');

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

function parseLocaleCsv(filePath: string): Record<string, LocalizedEntry> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const data: Record<string, LocalizedEntry> = {};
  
  const header = lines[0] || '';
  const isNewFormat = header.toLowerCase().includes('english name');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = parseCsvLine(line);
    if (cols.length < 4) continue;
    
    const hex = cols[0].trim();
    let name = '';
    let keywordsStr = '';

    if (isNewFormat && cols.length >= 5) {
      name = cols[3].trim();
      keywordsStr = cols[4].trim();
    } else {
      name = cols[2].trim();
      keywordsStr = cols[3].trim();
    }
    
    const keywords = keywordsStr.split(/[,;]/).map(k => k.trim()).filter(Boolean);
    data[hex] = { name, keywords };
  }
  return data;
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

    const customMy = parseLocaleCsv(CUSTOM_CSV_PATH);
    
    console.log(`Loading transformer pipeline... this may take a moment to drop the model locally.`);
    const extractor = await pipeline('feature-extraction', MODEL_NAME);

    const qualifiedEmojis = baseEmojis.filter(base => base.status === 'fully-qualified');

    console.log(`Generating Burmese index (${qualifiedEmojis.length} emojis)...`);
    const myData = [];
    let count = 0;
    
    for (const base of qualifiedEmojis) {
      if (++count % 500 === 0) console.log(`Processed ${count}/${qualifiedEmojis.length}...`);

      const myLocalized = burmeseAnnotations[base.emoji] || { name: '', keywords: [] };
      const myCustom = customMy[base.codePoints] || {};
      const myName = myCustom.name || myLocalized.name || base.name;
      const myKeywords = Array.from(new Set([...myLocalized.keywords, ...(myCustom.keywords || [])]));

      const textToEmbed = `${myName}. ${base.name}. ${myKeywords.join(', ')}`;
      const output = await extractor(textToEmbed, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data) as number[];

      myData.push({
        emoji: base.emoji,
        codePoints: base.codePoints,
        enName: base.name,
        myName: myName,
        displayName: myName,
        keywords: myKeywords,
        group: base.group,
        subgroup: base.subgroup,
        embedding
      });
    }
    fs.writeFileSync(path.join(process.cwd(), 'public/data/emoji/emoji-index-my.json'), JSON.stringify(myData));

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
  } catch (error) {
    console.error('Error generating data:', error);
    process.exit(1);
  }
}

main();
