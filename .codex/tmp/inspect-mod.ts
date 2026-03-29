async function main() {
  const mod = await import("../../lib/search-ranking.ts");
  console.log(Object.keys(mod));
  console.log(mod);
}
main().catch((error) => { console.error(error); process.exit(1); });
