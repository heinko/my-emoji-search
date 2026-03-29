# Burmese Search Analysis Review

> 📖 [Read in English](./burmese-segmentation-review.md)

ဒီ project က အခုတော့ Burmese search analysis ကို ပိုရှင်းတဲ့ ပုံစံနဲ့ သုံးပါတယ်:

- upstream-inspired `sylbreak` ကို syllable splitter အဖြစ် သုံးတယ်
- emoji data ကနေ local Burmese search lexicon တည်ဆောက်တယ်
- lexicon-backed syllable span တွေကနေ concept phrase ပြန်ဖော်တယ်

အရင်လို local query-time Burmese word segmenter ကို မသုံးတော့ပါ။ Burmese-specific analysis က broader locale-aware search system တစ်ခုထဲက အပိုင်းတစ်ခုဖြစ်ပြီး supported locale နဲ့ semantic availability ကို [lib/locale-config.ts](../lib/locale-config.ts) မှာ သတ်မှတ်ထားပါတယ်။

## အခု ဘာတွေကို ဆက်ထားလဲ

- [lib/sylbreak.ts](../lib/sylbreak.ts) က base Myanmar syllable splitter
- [lib/burmese-lexicon.ts](../lib/burmese-lexicon.ts) က in-app search lexicon တည်ဆောက်ပေးတယ်
- [lib/burmese-search.ts](../lib/burmese-search.ts) က syllable တွေကနေ search concept ပြန်ဖော်တယ်

## လက်ရှိ model

Burmese query တစ်ခုအတွက်:

1. text normalize
2. Myanmar spacing compact
3. `sylbreak` နဲ့ syllable ခွဲ
4. search lexicon ထဲမှာ ရှိတဲ့ syllable span တွေကို join ပြန်လုပ်
5. recovered phrase တွေကို lexical နဲ့ semantic search အတွက် သုံး

## အဟောင်း segmenter ကို ဘာကြောင့် ဖယ်လိုက်လဲ

လက်တွေ့မှာ query-time segmenter အဟောင်းက `sylbreak` နဲ့ output တူနေတာများပြီး၊ search quality ကို တိုးစေတဲ့အရာက concept recovery ဘက်မှာ ပိုရှိနေပါတယ်။ ဒါကြောင့် architecture က ရှင်းလင်းမှုနည်းပြီး အကျိုးအမြတ်က မများပါဘူး။

အခု model က ပိုရိုးရှင်းပြီး debug လုပ်ရလည်း လွယ်ပါတယ်:

- `syllables` က raw syllable
- `expandedTerms` က recovered concept
- `semanticViews` က embedding ပို့မယ့် view အမှန်တွေ

## ဥပမာ

Query:

`သဲကန္တာရထဲကားမောင်း`

Analysis:

- `syllables` → `["သဲ","ကန္","တာ","ရ","ထဲ","ကား","မောင်း"]`
- `expandedTerms` → `["သဲကန္တာရ","ကန္တာရ","ကားမောင်း"]`

ဒီ behavior က search အတွက် လိုချင်တဲ့ behavior ပါ။ ရည်ရွယ်ချက်က linguistically complete Burmese word segmentation မဟုတ်ဘဲ concept retrieval မှန်မှန်လုပ်ပေးဖို့ပါ။

## Reference

- [sylbreak](https://github.com/ye-kyaw-thu/sylbreak)
