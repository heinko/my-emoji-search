import fs from "fs";
import path from "path";
import { analyzeSearchQuery, buildSearchLexiconFromEmojiData, buildSemanticSignal, rankEmojiResults } from "../../lib/search-ranking.ts";
import { getLocaleConfig } from "../../lib/locale-config.ts";

const DEFAULT_EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || "https://heink0-burmese-emoji-embed-service.hf.space";

async function fetchEmbedding(text) {
  const endpoint = new URL('/embed', DEFAULT_EMBEDDING_SERVICE_URL);
  endpoint.searchParams.set('q', text.toLowerCase());
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`Failed embedding ${text} ${response.status}`);
  const data = await response.json();
  return data.vector;
}

async function main() {
  const localeId = "my";
  const query = "သဲကန္တာရထဲကားမောင်း";
  const locale = getLocaleConfig(localeId);
  const emojis = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/emoji/emoji-index-my.json"), "utf-8"));
  const vectors = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/emoji/emoji-vectors-my.json"), "utf-8"));
  const embeddingMap = new Map(vectors.map((entry) => [entry.codePoints, entry.embedding]));
  const enriched = emojis.map((emoji) => ({ ...emoji, embedding: embeddingMap.get(emoji.codePoints) }));
  const lexicon = buildSearchLexiconFromEmojiData(emojis);
  const analysis = analyzeSearchQuery(query, lexicon, locale.searchStrategy);
  const embeddings = await Promise.all(analysis.semanticViews.map(async (view) => ({ ...view, vector: await fetchEmbedding(view.text) })));
  const semanticSignal = buildSemanticSignal(enriched, embeddings);
  const ranked = rankEmojiResults(enriched, query, analysis, semanticSignal, { debug: false }).slice(0, 12).map((emoji) => ({ emoji: emoji.emoji, name: emoji.localizedName, score: emoji.score }));
  console.log(JSON.stringify({ analysis, ranked }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
