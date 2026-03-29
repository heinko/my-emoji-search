import fs from "fs";
import path from "path";

const emojis = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/emoji/emoji-index-my.json"), "utf-8"));
const hits = emojis
  .filter((emoji) => JSON.stringify([emoji.emoji, emoji.localizedName, ...(emoji.localizedKeywords ?? []), ...(emoji.contributorKeywords ?? []), ...(emoji.wordTokens ?? [])]).includes("ကြွေ"))
  .map((emoji) => ({ emoji: emoji.emoji, name: emoji.localizedName, keywords: emoji.localizedKeywords?.filter((k) => k.includes("ကြွေ")), contrib: emoji.contributorKeywords?.filter((k) => k.includes("ကြွေ")), tokens: emoji.wordTokens?.filter((k) => k.includes("ကြွေ")) }))
  .slice(0, 20);
console.log(JSON.stringify(hits, null, 2));
