import fs from "fs";
import path from "path";
import { analyzeSearchQuery, buildSearchLexiconFromEmojiData, rankEmojiResults } from "../../lib/search-ranking.ts";
import { getLocaleConfig } from "../../lib/locale-config.ts";

async function main() {
  const localeId = "my";
  const query = "သဲကန္တာရထဲကားမောင်း";
  const locale = getLocaleConfig(localeId);
  const emojis = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/emoji/emoji-index-my.json"), "utf-8"));
  const lexicon = buildSearchLexiconFromEmojiData(emojis);
  const analysis = analyzeSearchQuery(query, lexicon, locale.searchStrategy);
  const ranked = rankEmojiResults(emojis, query, analysis, undefined, { debug: false }).slice(0, 15).map((emoji) => ({ emoji: emoji.emoji, name: emoji.localizedName, score: emoji.score }));
  console.log(JSON.stringify({ analysis, ranked }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
