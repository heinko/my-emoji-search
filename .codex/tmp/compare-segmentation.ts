import { analyzeBurmeseQuery } from "../../lib/burmese-search.ts";
import { buildEmojiSearchLexicon } from "../../lib/burmese-search.ts";
import { sylbreak } from "../../lib/sylbreak.ts";
import { compactMyanmarText } from "../../lib/oppa-word.ts";
import fs from "fs";
import path from "path";

const emojis = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/emoji/emoji-index-my.json"), "utf-8"));
const lexicon = buildEmojiSearchLexicon(emojis);
const queries = [
  "သဲကန္တာရထဲကားမောင်း",
  "သဲကန္တာရ",
  "ကားမောင်း",
  "လက်မထောင်ခြင်း",
  "သံလိုက်အိမ်မြှောင်",
  "ပျော်ရွှင်",
  "ရွက်လှေ",
  "ကုလားအုတ်",
  "အချစ်",
  "ကြွေ"
];

const rows = queries.map((query) => {
  const compact = compactMyanmarText(query.toLowerCase());
  const syllables = sylbreak(compact);
  const analysis = analyzeBurmeseQuery(query.toLowerCase(), lexicon);
  return {
    query,
    compact,
    sylbreak: syllables,
    segmentedTerms: analysis.segmentedTerms,
    expandedTerms: analysis.expandedTerms,
    sameAsSylbreak: JSON.stringify(syllables) === JSON.stringify(analysis.segmentedTerms),
  };
});

console.log(JSON.stringify(rows, null, 2));
