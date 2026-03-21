# Burmese Emoji Search (AI-Powered Semantic Search)

A high-performance emoji search engine natively supporting Burmese (Myanmar) and English, utilizing `Transformers.js` for on-device AI embeddings and CLDR datasets for maximum localization.

## 🌟 Features

- **Genuine Semantic Search:** Powered by `Transformers.js` (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`). Understands abstract sentence associations cross-lingually (e.g. mapping "ကား" perfectly to the "car" vector space).
- **Proportional Syllable Matching:** Implements [Ye Kyaw Thu's `sylbreak`](https://github.com/ye-kyaw-thu/sylbreak) logic carefully weighted against false positives to handle Burmese compound words gracefully.
- **Offline & Private:** Downloads a heavily quantized `~45MB` AI model straight into your browser cache. All semantic searches happen 100% locally on your device's CPU/GPU.
- **Sustainable Data:** Automatically syncs with Unicode 16.0 and CLDR Derived Annotations to consistently fetch the latest localized keywords.

## 🛠️ Architecture

1.  **Preprocessing (`sylbreak`):** All Burmese input is broken into syllables using [sylbreak](https://github.com/ye-kyaw-thu/sylbreak) to match compound structures efficiently.
2.  **Transformers.js Embeddings:** Every locally-generated emoji holds a pre-computed 384-dimensional dense semantic vector.
3.  **Search Hook:** Real-time query vector extraction and **Cosine Similarity** ranking performed entirely locally using WebAssembly ONNX inference.

## 🚀 How to Update Emoji Data

To sync with the latest Unicode standards and regenerate the semantic vectors:

1.  Ensure `@huggingface/transformers` is installed.
2.  Optionally add highly specific keywords in `data/locales/my.csv`.
3.  Run the update command:

```bash
npm run update-emoji
```

## 🤝 Contributing Localizations

We welcome community contributions for localized Burmese keywords!

1.  Edit `data/locales/my.csv` (easier to edit in Excel or Google Sheets).
2.  Find the emoji's hex code and add natural Burmese keywords separated by commas.
3.  Run `npm run update-emoji` to rebuild the index.
4.  Submit a Pull Request!

## 💻 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **AI / Embeddings:** Transformers.js (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`)
- **Segmentation:** [Ye Kyaw Thu's `sylbreak`](https://github.com/ye-kyaw-thu/sylbreak) (JS Port)
- **Data Processing:** tsx + xml2js

## 📄 License

MIT
