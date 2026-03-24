# Burmese Emoji Search (AI-Powered Semantic Search)

![AI-Assisted](https://img.shields.io/badge/Built%20With-AI%20Assisted-6200ea?style=for-the-badge&logo=dependabot&logoColor=white)

A high-performance emoji search engine natively supporting Burmese (Myanmar) and English. By combining lexical syllable matching with a Serverless AI embedding pipeline, it delivers maximum localization and instant, highly intelligent emoji search results.

Developed by **Heinko**.

## 🌟 Overview

The Burmese Emoji Search is designed to bridge the gap between abstract thoughts and digital expression for the Myanmar language. Instead of relying purely on exact keyword matches, this app understands concept association (e.g., searching "sad" or "ဝမ်းနည်း" and finding a crying face 😭). It achieves this by using a hybrid architecture: lightning-fast local lexical search (powered by Syllable segmentation) combined with an offloaded Serverless Next.js API running powerful multilingual semantic embeddings.

## ✨ Features

- **Hybrid Semantic Search:** Powered by `Transformers.js` (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`). Understands abstract sentence associations cross-lingually (e.g. mapping "ကား" perfectly to the "car" vector space).
- **Proportional Syllable Matching:** Implements intelligent syllable logic to handle Burmese compound words gracefully, minimizing false positives.
- **Serverless AI Optimized:** To prevent mobile browser crashes (especially Safari) and battery drain, the heavy AI embedding extraction runs securely on a Vercel backend API, returning a tiny 1.5KB vector payload for instant client-side Cosine Similarity matching.
- **Sustainable Data:** Automatically syncs with Unicode 16.0 and CLDR Derived Annotations to consistently fetch the latest localized keywords.

## 🛠️ Architecture

1.  **Preprocessing (`sylbreak`):** All Burmese input is broken into syllables to match compound structures efficiently.
2.  **Server API Route:** The heavy `ONNX` transformer model is cached on the server. When typed, the query string is sent to the backend API (`/api/embed`), which instantly replies with a 384-dimensional dense vector.
3.  **Local Cosine Similarity:** The browser compares the lightweight 1.5KB query vector against the pre-loaded ~3,700 emoji vectors (`emoji-index-my.json`) in memory, ensuring `< 1ms` sorting speeds.

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

## 💻 Tech Stack & Credits

This project stands on the shoulders of incredible open-source technologies:

- **Architect:** Heinko
- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
- **AI / Embeddings:** [Transformers.js](https://huggingface.co/docs/transformers.js) dynamically loading [`Xenova/paraphrase-multilingual-MiniLM-L12-v2`](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2) 
- **Burmese NLP / Segmentation:** [`sylbreak`](https://github.com/ye-kyaw-thu/sylbreak) originally designed by Ye Kyaw Thu (ported to JS for this project).
- **Data Processing:** `tsx` + `xml2js` processing Unicode & CLDR Data.
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS

## 📄 License

MIT
