# Third-Party Notices

This repository includes original project code under the MIT License in
[LICENSE](./LICENSE).

It also relies on third-party data, models, libraries, and upstream references.
This file is a convenience summary only. The original upstream licenses,
notices, and terms remain authoritative.

## Data and Standards

### Unicode Emoji data

- Usage in this repo: source emoji metadata and code point definitions used by
  `data/scripts/update-emoji.ts`
- Upstream source: <https://www.unicode.org/Public/emoji/>
- License information: <https://www.unicode.org/copyright.html>
- Unicode licensing FAQ: <https://www.unicode.org/faq/unicode_license.html>

### CLDR annotations

- Usage in this repo: English and locale emoji names and keyword annotations
- Upstream source: <https://github.com/unicode-org/cldr>
- License information: <https://cldr.unicode.org/index/downloads>
- Unicode Terms of Use / Unicode License: <https://www.unicode.org/copyright.html>

## Models and Model Hosting

### intfloat/multilingual-e5-small

- Usage in this repo: build-time embedding generation and remote query
  embeddings for semantic search
- Upstream source: <https://huggingface.co/intfloat/multilingual-e5-small>
- Model card: <https://huggingface.co/intfloat/multilingual-e5-small>
- Report / citation: <https://arxiv.org/abs/2402.05672>
- License: MIT, as listed on the upstream model card

### Hugging Face platform and libraries

- Usage in this repo: model hosting in `hf-space-embed-service/` and embedding
  generation via `@huggingface/transformers`
- Upstream site: <https://huggingface.co/>
- Package source: <https://github.com/huggingface/transformers.js>
- License details should be checked per package, model, and hosted asset

## Upstream Code and Research References

### sylbreak

- Usage in this repo: Burmese syllable splitting approach and adapted local
  implementation in `lib/sylbreak.ts`
- Upstream reference: <https://github.com/ye-kyaw-thu/sylbreak>
- Please review the upstream repository for license and attribution details

### Reviewed but not directly implemented references

These are referenced for research context and review history and are not
described by this project as active implementation dependencies:

- myWord: <https://github.com/ye-kyaw-thu/myWord>
- NgaPi: <https://github.com/ye-kyaw-thu/NgaPi>
- oppaWord: <https://github.com/ye-kyaw-thu/oppaWord>

## Package Dependencies

The JavaScript and TypeScript dependencies installed through `npm` remain under
their respective licenses. See [package.json](./package.json) and
`package-lock.json` for the dependency set used by this repository.
