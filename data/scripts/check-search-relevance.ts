import fs from 'fs';
import path from 'path';
import cases from '../relevance/burmese-search-cases.json';
import { buildBurmeseSearchMetadata, buildEmojiSearchLexicon } from '../../lib/burmese-search';
import type { EmojiItem } from '../../lib/emoji-data';
import { getSkinToneMetadata } from '../../lib/emoji-skin-tone';
import {
  analyzeSearchQuery,
  buildSearchLexiconFromEmojiData,
  buildSemanticSignal,
  rankEmojiResults,
  tokenizeEnglish,
} from '../../lib/search-ranking';
import { sylbreak } from '../../lib/sylbreak';

const DEFAULT_EMBEDDING_SERVICE_URL =
  process.env.EMBEDDING_SERVICE_URL || 'https://heink0-burmese-emoji-embed-service.hf.space';

type RelevanceCase = {
  expectedTop10: string[];
  minimumHits: number;
  mustExcludeTop10?: string[];
  query: string;
};

async function fetchEmbedding(text: string): Promise<number[]> {
  const endpoint = new URL('/embed', DEFAULT_EMBEDDING_SERVICE_URL);
  endpoint.searchParams.set('q', text.toLowerCase());

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch embedding for "${text}" (${response.status})`);
  }

  const data = await response.json();
  if (!data.vector || !Array.isArray(data.vector)) {
    throw new Error(`Invalid embedding response for "${text}"`);
  }

  return data.vector;
}

function loadEmojiIndex(): EmojiItem[] {
  const indexFilePath = path.join(process.cwd(), 'public/data/emoji/emoji-index-my.json');
  const vectorFilePath = path.join(process.cwd(), 'public/data/emoji/emoji-vectors-my.json');
  const rawData = JSON.parse(fs.readFileSync(indexFilePath, 'utf-8')) as EmojiItem[];
  const rawVectors = JSON.parse(
    fs.readFileSync(vectorFilePath, 'utf-8')
  ) as Array<{ codePoints: string; embedding: number[] }>;
  const embeddingMap = new Map(rawVectors.map((entry) => [entry.codePoints, entry.embedding]));
  const lexicon = buildEmojiSearchLexicon(rawData);

  const enriched = rawData.map((emoji) => {
    const metadata =
      emoji.wordTokens?.length && emoji.searchTextMy
        ? { searchTextMy: emoji.searchTextMy, wordTokens: emoji.wordTokens }
        : buildBurmeseSearchMetadata(emoji.myName ?? '', emoji.keywords ?? [], lexicon);
    const skinToneMetadata = getSkinToneMetadata(emoji.codePoints);

    return {
      ...emoji,
      baseCodePoints: skinToneMetadata.baseCodePoints,
      enTokens: tokenizeEnglish(
        [emoji.enName, emoji.group, emoji.subgroup].filter(Boolean).join(' ')
      ),
      embedding: embeddingMap.get(emoji.codePoints),
      isSkinToneVariant: skinToneMetadata.isSkinToneVariant,
      searchTextMy: metadata.searchTextMy,
      skinTone: skinToneMetadata.skinTone,
      syllables: Array.from(
        new Set([
          ...sylbreak((emoji.myName ?? '').toLowerCase()),
          ...((emoji.keywords ?? []).flatMap((keyword) => sylbreak(keyword.toLowerCase()))),
        ])
      ),
      wordTokens: metadata.wordTokens,
    };
  });

  const skinToneGroupCounts = new Map<string, number>();
  for (const emoji of enriched) {
    if (!emoji.baseCodePoints) continue;
    skinToneGroupCounts.set(
      emoji.baseCodePoints,
      (skinToneGroupCounts.get(emoji.baseCodePoints) ?? 0) + 1
    );
  }

  return enriched.map((emoji) => ({
    ...emoji,
    supportsSkinTonePicker: (skinToneGroupCounts.get(emoji.baseCodePoints ?? '') ?? 0) > 1,
  }));
}

async function main() {
  const emojis = loadEmojiIndex();
  const lexicon = buildSearchLexiconFromEmojiData(emojis);

  let passCount = 0;
  for (const relevanceCase of cases as RelevanceCase[]) {
    const analysis = analyzeSearchQuery(relevanceCase.query, lexicon);
    const embeddings = await Promise.all(
      analysis.semanticViews.map(async (view) => ({
        ...view,
        vector: await fetchEmbedding(view.text),
      }))
    );
    const semanticSignal = buildSemanticSignal(emojis, embeddings);
    const top10 = rankEmojiResults(emojis, relevanceCase.query, analysis, semanticSignal).slice(0, 10);
    const top10Emojis = top10.map((emoji) => emoji.emoji);

    const hits = relevanceCase.expectedTop10.filter((emoji) => top10Emojis.includes(emoji));
    const excludes = (relevanceCase.mustExcludeTop10 ?? []).filter((emoji) => top10Emojis.includes(emoji));
    const passed = hits.length >= relevanceCase.minimumHits && excludes.length === 0;

    if (passed) {
      passCount++;
    }

    console.log(
      `${passed ? 'PASS' : 'FAIL'}  ${relevanceCase.query}  hits=${hits.length}/${relevanceCase.minimumHits}  top10=${top10Emojis.join(' ')}`
    );

    if (excludes.length > 0) {
      console.log(`  unexpected: ${excludes.join(' ')}`);
    }
  }

  console.log(`\n${passCount}/${cases.length} relevance checks passed`);
  if (passCount !== cases.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
