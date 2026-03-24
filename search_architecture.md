# Burmese Emoji Finder: Search Architecture & Data Pipeline

This document explains the core mechanics behind how emojis are indexed, embedded, and searched using both normal string matching and modern on-device semantic Transformers.

---

## 1. Data Preparation ([data/scripts/update-emoji.ts](file:///c:/Users/heink/v0-burmese-emoji-search-su/data/scripts/update-emoji.ts))
The [update-emoji.ts](file:///c:/Users/heink/v0-burmese-emoji-search-su/data/scripts/update-emoji.ts) script is responsible for building a static database (`emoji-index-my.json`) of all emojis mapped to the Myanmar language, complete with semantic embeddings vectors.

### Process:
1. **Source Collection**: 
   - Fetches the official **Unicode 16.0** emoji definitions to get the base layout.
   - Fetches the latest **CLDR (Common Locale Data Repository)** annotations for the Burmese (`my`) locale to get localized names and keywords.
   - Merges customized overrides from a local CSV ([data/locales/my.csv](file:///c:/Users/heink/v0-burmese-emoji-search-su/data/locales/my.csv)).
2. **Text Normalization**: Merges the custom names, official localization names, and English fallbacks into a comprehensive search string for each emoji (e.g., `"မျက်နှာလွှဲ. grin. ရယ်, ပြုံး"`).
3. **Embedding Generation**: 
   - Downloads the `Xenova/paraphrase-multilingual-MiniLM-L12-v2` transformer model during build time.
   - Feeds the combined text string into the model to generate a **384-dimensional dense vector** (embedding) representing the semantic meaning of that emoji.
4. **Export**: Saves all data, including the raw `number[]` embeddings, to `emoji-index-my.json`.

---

## 2. Normal (Lexical) Search ([hooks/use-semantic-search.ts](file:///c:/Users/heink/v0-burmese-emoji-search-su/hooks/use-semantic-search.ts))
When the user types a query without the "Semantic Search" toggle enabled, the app uses a highly optimized syllabus-based string matching algorithm.

### Scoring Logic:
1. **Syllable Segmentation**: The query is segmented into distinct Burmese syllables using the [sylbreak](file:///c:/Users/heink/v0-burmese-emoji-search-su/lib/sylbreak.ts#51-62) utility (e.g., `ကျောင်းသား` -> `ကျောင်း`, `သား`).
2. **Exact / Substring Match**:
   - If the query exactly matches the emoji's English name, Burmese name, or a keyword: **+2.0 points**.
   - If the query is a substring of those fields: **+1.0 point**.
3. **Proportional Syllable Match**:
   - The app segments the emoji's name and keywords into syllables as well.
   - It checks how many of the query's syllables exist in the emoji's syllables. 
   - Adds up to **+0.6 points** based on the ratio. This allows compound Burmese words to partially match without needing an exact substring.
4. **Filtering**: Results with a score `> 0.45` are returned and sorted (top 48).

---

## 3. Semantic Search
When the "Semantic Search" toggle is enabled, the app supercharges the Lexical Search by running AI directly inside the user's browser.

### The Mechanism:
1. **On-Device Transformers**: The browser dynamically pulls the ONNX weights for `Xenova/paraphrase-multilingual-MiniLM-L12-v2` straight from Hugging Face into memory using Transformers.js. No backend server is required.
2. **Live Embedding**: The user's typed query is run through the model, generating a 384-dimensional vector locally inside the browser.
3. **Cosine Similarity**: The app compares the query vector against the 384-dimensional vectors of all ~3,700 emojis using Cosine Similarity (measuring the angle between vectors).
4. **Score Boosting**:
   - The Lexical Search score is calculated identically to Normal Search.
   - If the Cosine Similarity is highly correlated (`> 0.6`), a massive **+3.0 point boost** is applied.
   - If the Cosine Similarity is moderately correlated (`> 0.45`), a **+1.5 point boost** is applied.

### Why it's powerful:
By combining Lexical Syllable matching with Multilingual Semantic Embeddings, the engine can find emojis based on concept (e.g., searching "sad" will return a crying face even if the word "sad" isn't explicitly in the keywords), while still respecting exact word matches natively in Burmese.
