---
title: Burmese Emoji Embed Service
emoji: "🔎"
colorFrom: yellow
colorTo: green
sdk: docker
app_port: 7860
short_description: Embedding API for Burmese emoji semantic search
models:
  - Xenova/paraphrase-multilingual-MiniLM-L12-v2
---

# Hugging Face Space Embed Service

This folder is a Docker-based Hugging Face Space that serves the same
`Xenova/paraphrase-multilingual-MiniLM-L12-v2` embedding model used by the app.

## Endpoints

- `GET /health`
- `GET /embed?q=...`

The embed response shape is:

```json
{ "vector": [0.1, 0.2, 0.3] }
```

## Space Setup

1. Create a new Hugging Face Space.
2. Choose the `Docker` SDK.
3. Upload the contents of this folder as the Space repository.
4. Optionally set `SERVICE_TOKEN` if you want the Space to require a bearer token.
5. Wait for the Space build to finish.

## App Setup

Set these env vars in Vercel:

- `EMBEDDING_SERVICE_URL`
  Example: `https://your-space-name.hf.space`
- `EMBEDDING_SERVICE_TOKEN`
  Required only if you configured `SERVICE_TOKEN` on the Space.
