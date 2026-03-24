import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';

const UNICODE_VERSION = '16.0';
const EMOJI_TEST_URL = `https://unicode.org/Public/emoji/${UNICODE_VERSION}/emoji-test.txt`;
const CLDR_MY_URL = 'https://raw.githubusercontent.com/unicode-org/cldr/main/common/annotations/my.xml';
const CLDR_MY_DERIVED_URL = 'https://raw.githubusercontent.com/unicode-org/cldr/main/common/annotationsDerived/my.xml';

const CSV_PATH = path.join(process.cwd(), 'data/locales/my.csv');

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
  
  // Try to determine if it's the old format or new format based on header
  const header = lines[0] || '';
  const isNewFormat = header.toLowerCase().includes('english name');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // We only use regex for old format parsing fallback, but prefer parseCsvLine and map logic
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
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([^;]+);([^#]+)# ([^ ]+) E([^ ]+) (.+)$/);
    if (match) {
      emojis.push({
        codePoints: match[1].trim().replace(/\s+/g, '-'),
        status: match[2].trim(),
        emoji: match[3].trim(),
        name: match[5].trim(),
        group: '',
        subgroup: '',
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

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

async function main() {
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
  
  // Merge CLDR annotations
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

  // Read existing custom overrides
  const customMy = parseLocaleCsv(CSV_PATH);

  const qualifiedEmojis = baseEmojis.filter(base => base.status === 'fully-qualified');

  console.log(`Generating comprehensive contribution CSV for ${qualifiedEmojis.length} emojis...`);
  
  const csvLines: string[] = [];
  csvLines.push('Hex,Emoji,English Name,Myanmar Name,Keywords');

  for (const base of qualifiedEmojis) {
    const codePoint = base.codePoints;
    const emoji = base.emoji;
    const enName = base.name;
    
    const cldrLoc = burmeseAnnotations[emoji] || { name: '', keywords: [] };
    const customLoc = customMy[codePoint] || {};

    const myName = customLoc.name || cldrLoc.name || '';
    const myKeywordsArr = Array.from(new Set([...(cldrLoc.keywords || []), ...(customLoc.keywords || [])])).filter(Boolean);
    const myKeywords = myKeywordsArr.join(', ');

    csvLines.push(`${codePoint},${emoji},${escapeCsv(enName)},${escapeCsv(myName)},${escapeCsv(myKeywords)}`);
  }

  fs.writeFileSync(CSV_PATH, csvLines.join('\n'));
  console.log(`Successfully generated contribution CSV at ${CSV_PATH}. Users can now edit this file and run index build.`);
}

main().catch(console.error);
