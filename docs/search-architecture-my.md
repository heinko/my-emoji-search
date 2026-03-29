# Myanmar Emoji Search Architecture

> 📖 [Read in English](./search-architecture.md)

ဒီစာရွက်စာတမ်းက လက်ရှိ search architecture ကို ဖော်ပြထားပါတယ်။ အဟောင်း query-time word segmenter ကို ဖယ်ရှားပြီးနောက် Burmese search က အခုဆိုရင် ဒီလမ်းကြောင်းနဲ့ အလုပ်လုပ်ပါတယ်:

- `sylbreak` နဲ့ syllable ခွဲတယ်
- emoji name/keyword တွေကနေ Burmese search lexicon တည်ဆောက်တယ်
- lexicon ထဲမှာ ရှိတဲ့ syllable span တွေကနေ concept phrase ပြန်ဖော်တယ်
- raw query နဲ့ recovered concept တွေကို semantic search အတွက် သုံးတယ်

## ၁။ Offline Data Build

[data/scripts/update-emoji.ts](../data/scripts/update-emoji.ts) က locale တစ်ခုစီအတွက် runtime dataset ထုတ်ပေးပါတယ်။

### Burmese indexing

Burmese အတွက် dataset build လုပ်တဲ့အခါ:

- localized name
- localized keyword
- contributor keyword
- ရှိပြီးသား `wordTokens`

တွေကနေ search lexicon တည်ဆောက်ပါတယ်။

ပြီးရင် [buildBurmeseSearchMetadata()](../lib/burmese-search.ts) က `wordTokens` ကို ဒီလိုထုတ်ပါတယ်:

1. text normalize
2. compact Myanmar text
3. `sylbreak` နဲ့ syllable ခွဲ
4. lexicon-backed syllable span တွေကနေ concept phrase ပြန်ဖော်

ဒါကြောင့် index ထဲက Burmese token တွေဟာ general-purpose word segmentation result မဟုတ်ဘဲ search အတွက် အသုံးဝင်မယ့် concept token တွေပါ။

## ၂။ Runtime Search

Runtime logic အဓိကနေရာတွေက:

- [hooks/use-semantic-search.ts](../hooks/use-semantic-search.ts)
- [lib/burmese-search.ts](../lib/burmese-search.ts)
- [lib/burmese-lexicon.ts](../lib/burmese-lexicon.ts)
- [lib/search-ranking.ts](../lib/search-ranking.ts)

### Burmese query analysis

Burmese query တစ်ခုလာရင်:

1. normalize လုပ်တယ်
2. compact Myanmar text ပြောင်းတယ်
3. `sylbreak` နဲ့ syllable ခွဲတယ်
4. lexicon ထဲမှာ ရှိတဲ့ span တွေကနေ concept phrase ပြန်ဖော်တယ်
5. `semanticViews` ကို
   - raw query
   - spaced syllable view
   - recovered concept phrase
   တွေကနေ တည်ဆောက်တယ်

### အရေးကြီး analysis field တွေ

- `syllables`: `sylbreak` ထွက်တဲ့ raw syllable တွေ
- `expandedTerms`: `သဲကန္တာရ`, `ကားမောင်း` လို recovered concept phrase တွေ
- `semanticViews`: embedding service ဆီပို့မယ့် view တွေ

## ၃။ Lexical Ranking

Lexical ranking က browser ထဲမှာပဲ အမြဲ run ပါတယ်။

### Burmese

Burmese ranking က:

- compact query exact match
- localized keyword / contributor match
- syllable overlap
- `expandedTerms` concept support

တို့ကို သုံးပါတယ်။

ဒါဟာ intentional search-oriented design ပါ။ ရည်ရွယ်ချက်က perfect Burmese segmentation မဟုတ်ဘဲ Burmese query ကနေ emoji concept မှန်မှန်ရှာပေးနိုင်ဖို့ပါ။

### English နဲ့ Shan

English နဲ့ Shan က generic path ကို ဆက်သုံးပါတယ်။

## ၄။ Semantic Search

Semantic search ကို locale config နဲ့ UI toggle ပေါ် မူတည်ပြီး ဖွင့်ပါတယ်။

ဖွင့်ထားရင်:

1. `semanticViews` တစ်ခုချင်းစီကို embed လုပ်တယ်
2. precomputed emoji embedding တွေနဲ့ browser ထဲမှာ similarity တွက်တယ်
3. lexical evidence အပေါ် semantic boost ထပ်ပေါင်းတယ်

လက်ရှိ repo အခြေအနေအရ semantic vector file ကို Burmese (`my`) နဲ့ English (`en`) အတွက် ထုတ်ထားပြီး Shan (`shn`) က lexical-only ဖြစ်ပါတယ်။

Burmese အတွက် recovered concept phrase တွေ အရေးကြီးပါတယ်။ Burmese query အရှည်တစ်ခုမှာ raw sentence embedding တစ်ခုတည်းထက် `သဲကန္တာရ`, `ကားမောင်း` လို concept view တွေက ပိုအသုံးဝင်တတ်ပါတယ်။

English လို generic locale တွေမှာတော့ normalized query တစ်ခုကို အဓိက semantic view အနေနဲ့ သုံးပြီး အတူတူ vector-comparison path ကို ဆက်အသုံးပြုပါတယ်။

## ၅။ ဒီ simplified design ကို ဘာကြောင့် ရွေးလဲ

အဟောင်း query path က:

- syllable splitting
- partial word segmentation
- concept recovery

တို့ကို ရောသုံးထားပါတယ်။

လက်တွေ့မှာတော့ query-time segmenter က `sylbreak` နဲ့ အတူတူ output ထွက်တတ်တာများပြီး အဓိကအသုံးဝင်တာက concept recovery ဘက်ဖြစ်နေတာကို တွေ့ရပါတယ်။ အခု architecture က အဲဒါကို ပိုရှင်းအောင် ဖော်ပြထားပါတယ်:

- `sylbreak` က base layer
- lexicon က concept recovery ကို မောင်းနှင်တယ်
- ranking က concept ကို အခြေခံတယ်

## References

- [sylbreak](https://github.com/ye-kyaw-thu/sylbreak)
- [Multilingual E5 model card](https://huggingface.co/intfloat/multilingual-e5-small)
- [Multilingual E5 technical report](https://arxiv.org/abs/2402.05672)
