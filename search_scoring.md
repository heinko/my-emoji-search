# Burmese Emoji Search Scoring

This document reflects the current ranking implementation in [lib/search-ranking.ts](/Users/heink/v0-burmese-emoji-search-su/lib/search-ranking.ts).

## Summary

The current search stack is hybrid:

- lexical scoring is always computed in the browser
- semantic scoring is optional and only runs when semantic mode is enabled
- cohort boosting is triggered from strong combined lexical + semantic candidates
- skin-tone variants are collapsed for presentation
- browser console debug logging is available for every search

## 1. Query Analysis

The query is normalized to lowercase and trimmed first.

### English queries

For non-Burmese queries:

- `englishTokens` are extracted with a simple alphanumeric tokenizer
- `semanticViews` contains the normalized query as one view
- Burmese segmentation is skipped

### Burmese queries

For Burmese queries:

- `compactQuery` is generated with the Myanmar text compaction rules
- `segmentedTerms` come from the oppaWord-inspired segmenter
- `semanticViews` include the original Burmese query plus the segmented view when available

This keeps ranking focused on word-level evidence instead of syllable-only overlap.

## 2. English Lexical Scoring

English lexical scoring uses:

- `enName`
- `group`
- `subgroup`
- `enTokens`

### Score components

- exact full-field match: `+2.2`
- phrase match inside an English field: `+1.0`
- token overlap: up to `+0.9`

The token-overlap term is:

- `matchedWords / queryTokens.length * 0.9`

## 3. Burmese Lexical Scoring

Burmese lexical scoring uses:

- `myName`
- `keywords`
- `wordTokens`
- `contributorKeywords`

`searchTextMy` is no longer part of runtime ranking.

### Score components

- exact compact-field match: `+3.0`
- substring compact-field match: `+1.1` for compact Burmese queries with length `>= 4`
- short-query contributor recovery: `+0.8`
- phrase field match: `+1.0`
- exact or substring contributor-keyword match: `+2.3`
- segmented term coverage: up to `+2.0`
- full segmented-term coverage bonus for multi-term queries: `+0.5`
- phrase + segmented support bonus: `+0.6`
- contributor-keyword segmented coverage: up to `+1.3`
- expanded segmented-term support: up to `+0.45`

### Important behavior

- the old direct `sylbreak` fallback is no longer used for ranking
- ranking depends on oppaWord-style term support plus curated keyword support
- very short Burmese fragments do not get the broad substring boost

## 4. Semantic Scoring

Semantic scoring only runs when semantic mode is enabled.

### Inputs

- query embeddings from `/api/embed`
- precomputed emoji embeddings from `emoji-vectors-my.json`

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

The current semantic boost is:

- `normalized * 4 * semanticGate(...)`

### Semantic gate

The semantic gate still depends on lexical strength:

- lexical score `>= 1.6`: gate = `1`
- lexical score `>= 0.8`: gate = `0.7`
- otherwise:
  - Burmese query: gate = `0.25`
  - non-Burmese query: gate = `0.45`

## 5. Cohort Boosting

After lexical and semantic contributions are estimated, the scorer looks for strong cohort seeds.

### Cohort seed rule

A candidate becomes a cohort seed when:

- `lexicalScore + semanticBoost > 10`

Position does not matter. The scorer inspects all candidates that clear that combined threshold.

### Cohort detection

From those seed candidates:

- if at least 2 share the same `subgroup`, that `subgroup` becomes dominant
- if at least 2 share the same `group`, that `group` becomes dominant

The seed list is sorted by combined `lexicalScore + semanticBoost`, but the dominant cohort itself is chosen by the summed lexical strength of agreeing seeds.

### Cohort boosts

Once a dominant cohort exists:

- same `subgroup`: `+3`
- same `group`: `+1.5`

Guardrails:

- seed emojis themselves do not get a cohort boost
- a candidate still needs some lexical evidence of its own before cohort boosting applies
- cohort boosting is only applied after a dominant `group` or `subgroup` is established

## 6. Skin Tone Behavior

Skin-tone variants are still present in the dataset, but skin tone does not add its own numeric score.

Current behavior:

- explicit tone queries can still filter results
- result lists are collapsed so a skin-tone family does not flood the grid
- the default skin-tone variant is preferred when collapsing

## 7. Final Ranking

For each emoji:

- compute lexical score
- compute semantic boost
- infer dominant cohort from candidates whose `lexical + semantic > 10`
- add cohort boost if the emoji matches that dominant `group` or `subgroup`
- combine into the final score:
  - `final = lexical + semantic + cohort`

Then:

- Burmese results must score above `5`
- non-Burmese results must score above `4`
- results are sorted descending by final score
- skin-tone variants are collapsed unless the query explicitly requests tones
- the final list is truncated to the top `48`

## 8. Debug Logging

The browser logs ranking debug information for each search.

Current debug output includes:

- query analysis details
- detected dominant `group` and `subgroup`
- every ranked result, not just the top slice
- per-result columns for:
  - lexical score
  - cohort boost
  - semantic boost
  - semantic similarity
  - final score
  - `wordTokens`

This logging is emitted from [lib/search-ranking.ts](/Users/heink/v0-burmese-emoji-search-su/lib/search-ranking.ts) and enabled by [hooks/use-semantic-search.ts](/Users/heink/v0-burmese-emoji-search-su/hooks/use-semantic-search.ts).
