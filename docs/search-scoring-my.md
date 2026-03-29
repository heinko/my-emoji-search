# Myanmar Emoji Search Scoring

> 📖 [Read in English](./search-scoring.md)

ဒီစာရွက်စာတမ်းက [lib/search-ranking.ts](../lib/search-ranking.ts) ထဲက လက်ရှိ ranking behavior ကို ဖော်ပြထားပါတယ်။

## Summary

အခု search stack က concept-oriented ဖြစ်ပါတယ်:

- lexical scoring က browser ထဲမှာ အမြဲ run တယ်
- semantic scoring က optional ဖြစ်ပြီး locale config မှာ ဖွင့်ထားတဲ့ locale တွေအတွက်ပဲ ရနိုင်တယ်
- Burmese query analysis က `sylbreak` + lexicon-backed concept recovery ကို သုံးတယ်
- semantic search က semantic-enabled locale တွေအတွက် weighted query view တွေကို embed လုပ်တယ်

## ၁။ Query Analysis

### Generic locale

English နဲ့ Shan က generic path ကို သုံးတယ်:

- alphanumeric token ထုတ်တယ်
- normalized query တစ်ခုတည်းကို semantic view အနေနဲ့ သုံးတယ်

### Burmese

Myanmar text တွေ့ရင်:

- `compactQuery` ကို Myanmar compaction rules နဲ့ ထုတ်တယ်
- `syllables` က `sylbreak` ကနေ တိုက်ရိုက်လာတယ်
- `expandedTerms` က Burmese search lexicon ထဲမှာ support ရှိတဲ့ recovered concept phrase တွေ
- `semanticViews` ထဲမှာ:
  - raw query
  - spaced syllable view
  - recovered concept phrase
  တွေ ပါတယ်

ဥပမာ:

- `syllables`: `["သဲ","ကန္","တာ","ရ","ထဲ","ကား","မောင်း"]`
- `expandedTerms`: `["သဲကန္တာရ","ကန္တာရ","ကားမောင်း"]`

## ၂။ Generic Lexical Scoring

Generic scoring က:

- `localizedName`
- `localizedKeywords`
- `contributorKeywords`
- `enName`
- `englishKeywords`
- `group`
- `subgroup`

တို့ကို သုံးတယ်။

## ၃။ Burmese Lexical Scoring

Burmese scoring က:

- exact `compactQuery` match
- query ရှည်ရင် compact substring match
- contributor keyword match
- `syllables` overlap
- `expandedTerms` concept support

တို့ကို သုံးပါတယ်။

အရေးကြီးတဲ့အချက်:

- query-time Burmese word segmenter ကို မသုံးတော့ပါ
- `syllables` က base unit ဖြစ်တယ်
- `expandedTerms` က concept layer ဖြစ်တယ်
- Burmese fragment အတိုလေးတွေကို broad substring match မပေးဘူး

## ၄။ Semantic Scoring

Semantic scoring ကို semantic mode ဖွင့်ထားပြီး selected locale က semantic vector support ရှိမှ run ပါတယ်။

Burmese အတွက်:

1. `semanticViews` တစ်ခုချင်းစီကို embed လုပ်တယ်
2. emoji embedding တွေနဲ့ cosine similarity တွက်တယ်
3. strongest weighted view signal ကို ယူတယ်
4. semantic boost အဖြစ် ပြောင်းတယ်

အခု Burmese semantic search က concept view တွေပါ embed လုပ်တဲ့အတွက် query အရှည်တွေမှာ ပိုအသုံးဝင်လာပါတယ်။

English အတွက်လည်း semantic boost pipeline ကို သုံးနိုင်ပေမယ့် Burmese concept-recovery path မဟုတ်ဘဲ generic query-analysis path ပေါ်မှာ run ပါတယ်။

## ၅။ Final Ranking

Emoji တစ်ခုချင်းစီအတွက်:

1. lexical score တွက်တယ်
2. semantic mode ဖွင့်ထားရင် semantic boost တွက်တယ်
3. strong cluster တွေ့ရင် cohort boost ထပ်ပေါင်းတယ်
4. minimum score filter လုပ်တယ်
5. အမြင့်ကနေ အနိမ့်စီတယ်
6. skin-tone variant တွေကို collapse လုပ်တယ်

## ၆။ Debugging

App ထဲမှာ Burmese query အတွက် optional query breakdown popup ရှိပါတယ်။ အဲဒီထဲမှာ:

- `sylbreak` output
- recovered concept phrase
- semantic view နဲ့ weight

တွေကို ကြည့်နိုင်ပါတယ်။ Burmese query တစ်ခု ဘာကြောင့် ဒီလို rank ထွက်သလဲ ဆိုတာကို နားလည်ဖို့ အလွယ်ဆုံးနေရာပါ။
