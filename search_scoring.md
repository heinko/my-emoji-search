# Burmese Emoji Search Scoring

This document explains the current ranking logic in detail, including the exact score sources and how semantic search interacts with lexical search.

## Summary

The search stack is hybrid:

- Lexical scoring is always computed in the browser
- Semantic scoring is optional and only runs when semantic mode is enabled
- Semantic similarity boosts lexical evidence instead of replacing it
- Skin-tone variants are collapsed for presentation, but skin tone no longer changes the numeric score

The main implementation lives in [lib/search-ranking.ts](/Users/heink/v0-burmese-emoji-search-su/lib/search-ranking.ts).

## 1. Query Analysis

The query is first normalized to lowercase and trimmed.

### English queries

If the query does not contain Myanmar text:

- `englishTokens` are extracted with a simple alphanumeric tokenizer
- `semanticViews` contains the normalized query as one view
- Burmese-specific segmentation is skipped

### Burmese queries

If the query contains Myanmar text:

- `compactQuery` is built using the project’s Myanmar text compaction rules
- `segmentedTerms` are generated with the oppaWord-inspired segmenter
- `semanticViews` include the original Burmese query plus a segmented view when available

This keeps the lexical scorer focused on word-level evidence instead of syllable overlap.

## 2. English Lexical Scoring

English scoring uses:

- `enName`
- `group`
- `subgroup`
- `enTokens`

### Score components

- Exact full-field match: `+2.2`
- Phrase match inside an English field: `+1.0`
- Token overlap: up to `+0.9`

Token overlap is proportional:

- `matchedWords / queryTokens.length * 0.9`

## 3. Burmese Lexical Scoring

Burmese scoring uses:

- `myName`
- `keywords`
- `searchTextMy`
- `wordTokens`
- `contributorKeywords`

### Score components

- Exact compact-field match: `+3.0`
- Substring compact-field match: `+1.1`, but only for compact Burmese queries with length `>= 4`
- Exact or substring contributor-keyword match: `+2.3`
- Segmented term coverage: up to `+2.0`
- Full segmented-term coverage bonus for multi-term queries: `+0.5`
- Contributor-keyword segmented coverage: up to `+1.3`
- Expanded segmented-term support: up to `+0.45`

### Important behavior

- The old `sylbreak` fallback is no longer part of ranking
- Ranking now depends on oppaWord-style word evidence and curated keyword evidence only
- Very short Burmese fragments do not receive the broad substring boost, which helps reduce noisy partial matches

This change is intended to reduce noisy matches that were getting in through syllable overlap alone.

## 4. Semantic Scoring

Semantic scoring only runs when semantic mode is enabled.

### Inputs

- Query embeddings from the HF Space via `/api/embed`
- Precomputed emoji embeddings from `emoji-vectors-my.json`

### Similarity calculation

For each emoji:

- cosine similarity is computed against each query view
- the strongest weighted view is used

### Dynamic thresholding

The semantic signal calculates:

- `floor`: 85th percentile of similarity scores
- `ceiling`: 99.5th percentile of similarity scores

Only similarities above `floor` contribute a semantic boost.

### Semantic boost

The normalized semantic signal is:

- `(similarity - floor) / (ceiling - floor)`

clamped to `[0, 1]`

The final semantic boost is:

- `normalized * 3.1 * semanticGate(...)`

### Semantic gate

The semantic gate depends on lexical strength:

- lexical score `>= 1.6`: gate = `1`
- lexical score `>= 0.8`: gate = `0.7`
- otherwise:
  - Burmese query: gate = `0.25`
  - non-Burmese query: gate = `0.45`

This is what keeps semantic search from overpowering obviously better lexical matches.

## 5. Skin Tone Behavior

Skin-tone variants still exist in the dataset, but skin tone no longer affects scoring.

Current behavior:

- Skin-tone variants can still be filtered when the query explicitly asks for a tone
- Results are collapsed so a skin-tone family does not flood the grid
- The UI skin-tone picker remains the primary way for users to choose a preferred tone

In other words:

- skin tone affects presentation and explicit filtering
- skin tone does not add a ranking bonus or penalty

## 6. Final Ranking

For each emoji:

- start with lexical score
- add semantic boost if semantic mode is enabled and the emoji clears the semantic floor

Then:

- Burmese results must score above `0.35`
- non-Burmese results must score above `0.25`
- results are sorted descending by final score
- skin-tone variants are collapsed unless the query explicitly requests tones
- the final result list is truncated to the top 36

## 7. Why This Version Exists

This version of the scorer is designed to highlight:

- oppaWord-style Burmese segmentation
- curated Burmese keyword quality
- semantic search as a secondary booster

It intentionally avoids weaker fallback behavior and reduces overly broad keyword dominance so the ranking stays more precise.
