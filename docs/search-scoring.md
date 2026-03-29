# Myanmar Emoji Search Scoring

> 📖 [မြန်မာဘာသာဖြင့် ဖတ်ရန်](./search-scoring-my.md)

This document reflects the current ranking behavior in [lib/search-ranking.ts](../lib/search-ranking.ts).

## Summary

The current stack is concept-oriented:

- lexical scoring always runs in the browser
- semantic scoring is optional and only available for locales that enable it in configuration
- Burmese query analysis uses `sylbreak` plus lexicon-backed concept recovery
- semantic search embeds weighted query views for semantic-enabled locales

## 1. Query Analysis

### Generic locales

English and Shan use the generic path:

- extract alphanumeric tokens
- use the normalized query as the only semantic view

### Burmese

When Myanmar text is detected:

- `compactQuery` is produced with Myanmar compaction rules
- `syllables` come directly from `sylbreak`
- `expandedTerms` are recovered concept phrases supported by the Burmese search lexicon
- `semanticViews` include:
  - the original query
  - the spaced syllable view
  - recovered concept phrases

Example shape:

- `syllables`: `["သဲ","ကန္","တာ","ရ","ထဲ","ကား","မောင်း"]`
- `expandedTerms`: `["သဲကန္တာရ","ကန္တာရ","ကားမောင်း"]`

## 2. Generic Lexical Scoring

Generic scoring uses:

- `localizedName`
- `localizedKeywords`
- `contributorKeywords`
- `enName`
- `englishKeywords`
- `group`
- `subgroup`

## 3. Burmese Lexical Scoring

Burmese scoring uses:

- exact `compactQuery` matches
- compact substring matches for longer terms
- contributor keyword matches
- syllable overlap from `syllables`
- recovered concept support from `expandedTerms`

Important behavior:

- the scorer no longer depends on a query-time Burmese word segmenter
- `syllables` are the honest base unit
- `expandedTerms` are the higher-value concept layer
- short Burmese fragments do not get broad substring matching

## 4. Semantic Scoring

Semantic scoring runs only when semantic mode is enabled and the selected locale supports semantic vectors.

For Burmese:

1. embed each `semanticView`
2. compare against emoji embeddings with cosine similarity
3. keep the strongest weighted query-view signal
4. convert that to a semantic boost

The semantic gate still depends on lexical strength, but Burmese now gets more useful semantic help because concept views are part of the embedding set.

For English, the same semantic boost pipeline is available, but it operates on the generic query-analysis path rather than the Burmese concept-recovery path.

## 5. Final Ranking

For each emoji:

1. compute lexical score
2. compute semantic boost if enabled
3. apply cohort boosting when a strong semantic + lexical cluster appears
4. filter by minimum score
5. sort descending
6. collapse skin-tone variants unless explicitly requested

## 6. Debugging

The app exposes an optional query breakdown popup for Burmese queries. It shows:

- `sylbreak` output
- recovered concept phrases
- semantic views with weights

That popup is the easiest way to inspect why a Burmese query ranked the way it did.
