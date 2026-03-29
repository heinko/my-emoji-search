# Myanmar Emoji Search Architecture

> 📖 [မြန်မာဘာသာဖြင့် ဖတ်ရန်](./search-architecture-my.md)

This document describes the current search architecture after removing the older query-time word segmenter. Burmese search now uses a simpler pipeline:

- `sylbreak` for syllable splitting
- a Burmese search lexicon built from emoji names and keywords
- concept recovery from syllable spans that exist in that lexicon
- optional semantic search over the raw query plus recovered concepts

## High-Level Design

The system still has two paths:

- Offline preparation: build locale-specific emoji data and optional embeddings
- Runtime search: rank locally in the browser and add semantic boosts when enabled

## 1. Offline Data Preparation

The build script in [data/scripts/update-emoji.ts](/Users/heink/v0-burmese-emoji-search-su/data/scripts/update-emoji.ts) generates one dataset per locale.

### Inputs

- Unicode emoji metadata
- CLDR English annotations
- CLDR locale annotations
- per-locale contributor keyword CSV files

### Burmese-specific indexing

For Burmese, the build step creates a search lexicon from:

- localized emoji names
- localized keywords
- contributor keywords
- existing `wordTokens`

Then [buildBurmeseSearchMetadata()](/Users/heink/v0-burmese-emoji-search-su/lib/burmese-search.ts) produces `wordTokens` using:

1. normalized Burmese text
2. compact Myanmar text
3. `sylbreak` syllables
4. recovered concept phrases from lexicon-backed syllable spans

This means the indexed Burmese tokens are concept-oriented search tokens, not outputs of a general-purpose Burmese word segmenter.

## 2. Runtime Search

The runtime path lives mainly in:

- [hooks/use-semantic-search.ts](/Users/heink/v0-burmese-emoji-search-su/hooks/use-semantic-search.ts)
- [lib/burmese-search.ts](/Users/heink/v0-burmese-emoji-search-su/lib/burmese-search.ts)
- [lib/burmese-lexicon.ts](/Users/heink/v0-burmese-emoji-search-su/lib/burmese-lexicon.ts)
- [lib/search-ranking.ts](/Users/heink/v0-burmese-emoji-search-su/lib/search-ranking.ts)

### Burmese query analysis

For Burmese queries:

1. normalize the query
2. compact Myanmar text
3. split with `sylbreak`
4. recover concept phrases from syllable spans that exist in the lexicon
5. build `semanticViews` from:
   - the raw query
   - a spaced syllable view
   - recovered concept phrases

### Important analysis fields

- `syllables`: raw `sylbreak` output
- `expandedTerms`: recovered concept phrases such as `သဲကန္တာရ` or `ကားမောင်း`
- `semanticViews`: the views sent to the embedding service

## 3. Lexical Ranking

Lexical ranking always runs in the browser.

### Burmese

Burmese ranking uses:

- exact compact-query matches
- localized keyword and contributor matches
- syllable overlap
- recovered concept support from `expandedTerms`

This is intentionally search-oriented. The goal is not perfect Burmese segmentation. The goal is to retrieve the right emoji concepts from real Burmese queries.

### English and Shan

English and Shan still use the generic lexical path with localized fields, English fallback fields, and token overlap.

## 4. Semantic Search

Semantic search currently runs only for Burmese.

When enabled:

1. the client embeds each `semanticView`
2. the browser compares those vectors against precomputed emoji embeddings
3. the strongest weighted semantic signal boosts lexical evidence

This is why recovered concept phrases matter. A longer Burmese query often needs concept-level views like `သဲကန္တာရ` or `ကားမောင်း`, not just one raw sentence embedding.

## 5. Why This Simpler Design

The earlier query path mixed:

- syllable splitting
- partial word segmentation
- concept recovery

In practice, the query-time segmenter often produced the same output as `sylbreak`, while concept recovery was doing most of the useful work. The current architecture makes that explicit:

- `sylbreak` is the base layer
- the lexicon powers concept recovery
- ranking is based on concepts, not on pretending we have a full Burmese segmenter

## References

- [sylbreak](https://github.com/ye-kyaw-thu/sylbreak)
- [Multilingual E5 model card](https://huggingface.co/intfloat/multilingual-e5-small)
- [Multilingual E5 technical report](https://arxiv.org/abs/2402.05672)
