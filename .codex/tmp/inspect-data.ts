import fs from "fs";
import path from "path";

const emojis = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/emoji/emoji-index-my.json"), "utf-8"));
const patterns = ["သဲ", "ကန္တာရ", "ကန္", "ကား", "မောင်း", "ကုလားအုတ်", "ရှားစောင်း", "ပြိုင်ကား"];
for (const pattern of patterns) {
  const hits = emojis
    .filter((emoji) => JSON.stringify([emoji.localizedName, ...(emoji.localizedKeywords ?? []), ...(emoji.contributorKeywords ?? []), ...(emoji.wordTokens ?? [])]).includes(pattern))
    .slice(0, 10)
    .map((emoji) => ({ emoji: emoji.emoji, name: emoji.localizedName }));
  console.log(pattern, JSON.stringify(hits, null, 2));
}
