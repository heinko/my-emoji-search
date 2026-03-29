# Burmese Search Analysis Review

> 📖 [မြန်မာဘာသာဖြင့် ဖတ်ရန်](./burmese-segmentation-review-my.md)

This project now uses a simpler Burmese search analysis stack:

- upstream-inspired `sylbreak` for syllable splitting
- a local Burmese search lexicon built from emoji data
- concept recovery from lexicon-backed syllable spans

It no longer ships a local query-time Burmese word segmenter.

## What We Keep

- [lib/sylbreak.ts](/Users/heink/v0-burmese-emoji-search-su/lib/sylbreak.ts) remains the base Myanmar syllable splitter
- [lib/burmese-lexicon.ts](/Users/heink/v0-burmese-emoji-search-su/lib/burmese-lexicon.ts) builds and scores the in-app search lexicon
- [lib/burmese-search.ts](/Users/heink/v0-burmese-emoji-search-su/lib/burmese-search.ts) recovers search concepts from syllables

## Current Model

For a Burmese query:

1. normalize text
2. compact Myanmar spacing
3. split with `sylbreak`
4. join syllable spans that exist in the search lexicon
5. use those recovered phrases for lexical and semantic search

## Why We Dropped the Older Segmenter

In practice, the older query-time segmenter often produced the same result as `sylbreak`, while the useful retrieval improvements came from concept recovery. That made the architecture harder to explain without giving much extra search value.

The current model is more honest and easier to debug:

- `syllables` are raw syllables
- `expandedTerms` are recovered concepts
- `semanticViews` are the actual embeddings we send

## Example

Query:

`သဲကန္တာရထဲကားမောင်း`

Analysis:

- `syllables` → `["သဲ","ကန္","တာ","ရ","ထဲ","ကား","မောင်း"]`
- `expandedTerms` → `["သဲကန္တာရ","ကန္တာရ","ကားမောင်း"]`

That is the behavior we want for search. The goal is concept retrieval, not a linguistically complete Burmese word segmentation system.

## Reference

- [sylbreak](https://github.com/ye-kyaw-thu/sylbreak)
