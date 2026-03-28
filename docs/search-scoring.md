# Myanmar Emoji Search Scoring

> 📖 [မြန်မာဘာသာဖြင့် ဖတ်ရန်](./search-scoring-my.md)

This document reflects the current ranking implementation in [lib/search-ranking.ts](/Users/heink/v0-burmese-emoji-search-su/lib/search-ranking.ts).

## Summary

The current search stack is hybrid and locale-aware:

- lexical scoring is always computed in the browser
- semantic scoring is optional and currently enabled only for Burmese
- English keywords are always merged into every supported locale
- cohort boosting is triggered from strong combined lexical + semantic candidates
- skin-tone variants are collapsed for presentation
- browser console debug logging is available for every search

## 1. Query Analysis

The query is normalized to lowercase and trimmed first.

### Generic locale queries

For locales using the generic strategy, such as Shan and English:

- `englishTokens` are extracted with the shared alphanumeric tokenizer
- `semanticViews` contains the normalized query as one view
- no Burmese segmentation is attempted

### Burmese queries

For Burmese locale searches where Myanmar text is detected:

- `compactQuery` is generated with Myanmar text compaction rules
- `segmentedTerms` come from the oppaWord-inspired segmenter
- `semanticViews` include the original Burmese query plus the segmented view when available

This keeps Burmese ranking focused on word-level evidence instead of syllable-only overlap.

## 2. Generic Locale Lexical Scoring

Generic lexical scoring uses:

- `localizedName`
- `localizedKeywords`
- `contributorKeywords`
- `enName`
- `englishKeywords`
- `group`
- `subgroup`

### Score components

- exact localized field match: `+4.4`
- localized substring or phrase support: `+1.2`
- localized token overlap: up to `+2.2`
- full localized token coverage bonus: `+1.3`
- exact English field match: `+2.2`
- English phrase match: `+1.0`
- English token overlap: up to `+2.4`
- full English token coverage bonus: `+1.8`

### Important behavior

- localized terms are stronger than English fallback terms
- English still broadens recall in every locale
- Shan currently uses this generic path
- English locale also uses this same generic path

## 3. Burmese Lexical Scoring

Burmese lexical scoring uses:

- `localizedName`
- `localizedKeywords`
- `wordTokens`
- `contributorKeywords`
- English fallback terms in the same emoji record

### Score components

- exact compact-field match: `+3.0`
- substring compact-field match: `+1.1` for compact Burmese queries with length `>= 4`
- short-query contributor recovery: `+0.8`
- phrase field match: `+1.0`
- exact or substring contributor-keyword match: `+2.3`
- segmented term coverage: up to `+2.0`
- full segmented-term coverage bonus for multi-term queries: `+0.5`
- phrase plus segmented support bonus: `+0.6`
- contributor-keyword segmented coverage: up to `+1.3`
- expanded segmented-term support: up to `+0.45`

### Important behavior

- the old direct `sylbreak` fallback is no longer used for ranking
- ranking depends on oppaWord-style term support plus curated keyword support
- very short Burmese fragments do not get the broad substring boost

## 4. Semantic Scoring

Semantic scoring only runs when semantic mode is enabled for the selected locale.

Current semantic-enabled locale:

- Burmese (`my`)

### Inputs

- query embeddings from `/api/embed`
- precomputed emoji embeddings from `emoji-vectors-<locale>.json`

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

### Cohort detection

From those seed candidates:

- if at least 2 share the same `subgroup`, that `subgroup` becomes dominant
- if at least 2 share the same `group`, that `group` becomes dominant

The dominant cohort is chosen by the summed lexical strength of agreeing seeds.

### Cohort boosts

Once a dominant cohort exists:

- same `subgroup`: `+3`
- same `group`: `+1.5`

Guardrails:

- seed emojis themselves do not get a cohort boost
- a candidate still needs some lexical evidence of its own before cohort boosting applies

## 6. Skin Tone Behavior

Skin-tone variants are still present in the dataset, but skin tone does not add its own numeric score.

Current behavior:

- explicit tone queries can still filter results
- result lists are collapsed so a skin-tone family does not flood the grid
- the default skin-tone variant is preferred when collapsing

## 7. Final Ranking

For each emoji:

- compute lexical score
- compute semantic boost if enabled for the locale
- infer dominant cohort from candidates whose `lexical + semantic > 10`
- add cohort boost if the emoji matches that dominant `group` or `subgroup`
- combine into the final score:
  - `final = lexical + semantic + cohort`

Then:

- Burmese segmented queries must score above `5`
- generic locale queries must score above `4`
- results are sorted descending by final score
- skin-tone variants are collapsed unless the query explicitly requests tones
- the final list is truncated to the top `48`

## 8. Debug Logging

The browser logs ranking debug information for each search.

Current debug output includes:

- query analysis details
- selected search strategy
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
