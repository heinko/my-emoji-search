# မြန်မာ Emoji ရှာဖွေရေး Scoring

> 📖 [Read in English](./search-scoring.md)

ဒီစာရွက်စာတမ်းက [lib/search-ranking.ts](../lib/search-ranking.ts) ထဲက လက်ရှိ ranking implementation ကို ဖော်ပြထားပါတယ်။

## အကျဉ်းချုပ်

လက်ရှိ search stack က hybrid ဖြစ်ပြီး locale-aware ဖြစ်ပါတယ်:

- Lexical scoring ကို browser ထဲမှာ အမြဲ တွက်ချက်ပါတယ်
- Semantic scoring က optional ဖြစ်ပြီး မြန်မာအတွက်သာ ဖွင့်ထားပါတယ်
- English keywords ကို locale တိုင်းထဲ merge ထားပါတယ်
- Cohort boosting ကို lexical + semantic ပေါင်း အားကောင်းတဲ့ candidate တွေကနေ trigger လုပ်ပါတယ်
- Skin-tone variant တွေကို ပြသချိန်မှာ collapse လုပ်ပါတယ်
- Browser console debug logging ကို search တိုင်းမှာ ရနိုင်ပါတယ်

## ၁. Query Analysis (Query ခွဲခြမ်းစိတ်ဖြာခြင်း)

Query ကို lowercase ပြောင်းပြီး trim လုပ်ပါတယ်။

### Generic locale queries (ရှမ်း၊ English)

- `englishTokens` ကို shared alphanumeric tokenizer နဲ့ extract လုပ်ပါတယ်
- `semanticViews` ထဲမှာ normalized query ကို view တစ်ခုအနေနဲ့ ထည့်ပါတယ်
- Burmese segmentation မကြိုးစားပါ

### Burmese queries (မြန်မာ)

Myanmar text ကို detect ရတဲ့အခါ:

- `compactQuery` ကို Myanmar text compaction rule တွေနဲ့ ဖန်တီးပါတယ်
- `segmentedTerms` ကို oppaWord-inspired segmenter ကနေ ရပါတယ်
- `semanticViews` ထဲမှာ မူရင်း Burmese query နဲ့ segmented view ပါဝင်ပါတယ်

ဒီလိုလုပ်ရတဲ့ အကြောင်းက syllable-only overlap ထက် word-level evidence ကို ဦးစားပေး ranking လုပ်ဖို့ ဖြစ်ပါတယ်။

#### ဥပမာ: query analysis နှိုင်းယှဉ်ခြင်း

| Query | Locale | compactQuery | segmentedTerms | englishTokens |
|---|---|---|---|---|
| `ပြုံး` | `my` | `ပြုံး` | `["ပြုံး"]` | — |
| `smiling face` | `en` | — | — | `["smiling", "face"]` |
| `heart` | `my` | — | — | `["heart"]` |
| `နှလုံးသားကွဲ` | `my` | `နှလုံးသားကွဲ` | `["နှလုံးသား", "ကွဲ"]` | — |

## ၂. Generic Locale Lexical Scoring

Generic lexical scoring က ဒီ field တွေကို သုံးပါတယ်:

- `localizedName` — ဒေသခံ emoji အမည်
- `localizedKeywords` — ဒေသခံ keywords
- `contributorKeywords` — contributor ထည့်ထားတဲ့ keywords
- `enName` — English emoji အမည်
- `englishKeywords` — English keywords
- `group` / `subgroup` — emoji category

### Score ပေးတဲ့ component များ

| Component | Score | ရှင်းလင်းချက် |
|---|---|---|
| ဒေသခံ field exact match | `+4.4` | Name သို့မဟုတ် keyword တိတိကျကျ ကိုက်ညီ |
| ဒေသခံ substring/phrase | `+1.2` | ဒေသခံ text ထဲမှာ အပိုင်းတစ်ခု ကိုက်ညီ |
| ဒေသခံ token overlap | `+2.2` အထိ | Token ကိုက်ညီမှု အချိုးအစား |
| ဒေသခံ token coverage bonus | `+1.3` | Token အားလုံး ကိုက်ညီရင် bonus |
| English field exact match | `+2.2` | English name/keyword exact match |
| English phrase match | `+1.0` | English phrase ကိုက်ညီ |
| English token overlap | `+2.4` အထိ | English token ကိုက်ညီမှု |
| English token coverage bonus | `+1.8` | English token အားလုံး ကိုက်ညီရင် bonus |

### အရေးကြီးတဲ့ behavior

- ✅ ဒေသခံ term တွေက English fallback ထက် အားပိုကောင်းပါတယ်
- ✅ English က locale တိုင်းမှာ recall ပိုကျယ်စေပါတယ်
- ရှမ်းနဲ့ English locale ၂ ခုစလုံး ဒီ generic path ကို သုံးပါတယ်

#### ဥပမာ: generic scoring

```
Query: "star" (English locale)
Emoji: ⭐

  enName: "star" → exact match → +4.4
  englishKeywords: ["star"] → exact → +2.2
  ─────────────────────────────
  Total lexical: ~6.6
```

```
Query: "bright" (English locale)
Emoji: ⭐

  enName: "star" → ❌
  englishKeywords: ["star"] → ❌
  ─────────────────────────────
  Total lexical: 0 (lexical ထဲမှာ မကိုက်ညီ၊ semantic ကမှ ကူပေးနိုင်)
```

## ၃. Burmese Lexical Scoring (မြန်မာ Lexical)

Burmese lexical scoring က ဒီ field တွေကို သုံးပါတယ်:

- `localizedName`
- `localizedKeywords`
- `wordTokens`
- `contributorKeywords`
- English fallback terms

### Score ပေးတဲ့ component များ

| Component | Score | ရှင်းလင်းချက် |
|---|---|---|
| Compact-field exact match | `+3.0` | Compact form တိတိကျကျ ကိုက်ညီ |
| Compact-field substring match | `+1.1` | Query length `≥ 4` ဖြစ်ရမယ် |
| Short-query contributor recovery | `+0.8` | Query တိုတိုအတွက် contributor keyword ကူ |
| Phrase field match | `+1.0` | Phrase ကိုက်ညီ |
| Contributor-keyword exact/substring | `+2.3` | Contributor keyword ကိုက်ညီမှု |
| Segmented term coverage | `+2.0` အထိ | Segmented term ကိုက်ညီမှု အချိုးအစား |
| Full segmented-term coverage bonus | `+0.5` | Multi-term query ရဲ့ term အားလုံး ကိုက်ညီရင် |
| Phrase + segmented support bonus | `+0.6` | Phrase ကိုက်ညီ + segmented term support ရှိရင် |
| Contributor segmented coverage | `+1.3` အထိ | Contributor keywords ထဲ segmented term ကိုက်ညီ |
| Expanded segmented-term support | `+0.45` အထိ | Expanded matching |

### အရေးကြီးတဲ့ behavior

- ❌ `sylbreak` fallback ဟောင်းကို ranking အတွက် မသုံးတော့ပါ
- ✅ Ranking က oppaWord-style term support + curated keyword support ကို မှီခိုပါတယ်
- ⚠️ မြန်မာ fragment တိုတိုတွေ broad substring boost မရပါ

#### ဥပမာ: Burmese lexical scoring

```
Query: "နှလုံးသား"
Emoji: ❤️

  localizedName: "နှလုံးသား" → compact exact match → +3.0
  wordTokens: ["နှလုံးသား"] → segmented term coverage → +2.0
  contributorKeywords: ["အချစ်"] → ❌
  ─────────────────────────────
  Total lexical: ~5.0
```

```
Query: "နှလုံးသားကွဲ"
Emoji: 💔

  segmentedTerms: ["နှလုံးသား", "ကွဲ"]
  localizedName: "နှလုံးကွဲ" → substring match → +1.1
  wordTokens: ["နှလုံး", "ကွဲ"] → term "ကွဲ" ကိုက်ညီ → partial coverage
  ─────────────────────────────
  Total lexical: ~3.2
```

## ၄. Semantic Scoring

Semantic scoring က ရွေးထားတဲ့ locale မှာ semantic mode ဖွင့်ထားမှသာ run ပါတယ်။

လက်ရှိ semantic-enabled locale:

- ✅ မြန်မာ (`my`)

### Input များ

- `/api/embed` ကနေ query embeddings
- `emoji-vectors-<locale>.json` ကနေ ကြိုတင်တွက်ထားတဲ့ emoji embeddings

### Similarity တွက်ချက်ခြင်း

Emoji တစ်ခုချင်းအတွက်:

- Query view တစ်ခုချင်းနဲ့ cosine similarity တွက်ပါတယ်
- အအားကောင်းဆုံး weighted view ကို သုံးပါတယ်

### Dynamic Thresholding

Semantic signal က ဒီတန်ဖိုးတွေကို တွက်ပါတယ်:

- `floor`: similarity score တွေရဲ့ 85th percentile
- `ceiling`: similarity score တွေရဲ့ 99.5th percentile

`floor` ထက် ကျော်တဲ့ similarity တွေသာ semantic boost ရပါတယ်။

### Semantic Boost တွက်ချက်ပုံ

Normalized semantic signal:

```
normalized = (similarity - floor) / (ceiling - floor)
clamped to [0, 1]
```

Semantic boost:

```
boost = normalized × 4 × semanticGate(...)
```

### Semantic Gate

Semantic gate က lexical strength ပေါ် မူတည်ပါတယ်:

| Lexical Score | Gate Value | ရှင်းလင်းချက် |
|---|---|---|
| `≥ 1.6` | `1.0` | Lexical evidence ခိုင်လုံ → semantic အပြည့်အဝ |
| `≥ 0.8` | `0.7` | Lexical evidence အလယ်အလတ် |
| `< 0.8` (Burmese query) | `0.25` | Lexical evidence အားနည်း → semantic ကန့်သတ် |
| `< 0.8` (non-Burmese query) | `0.45` | English query → semantic ပိုလွတ်လပ်ခွင့်ပေး |

#### ဥပမာ: semantic scoring flow

```
Query: "ကြောင်"
Emoji: 🐱

  lexical score: 3.0 (≥ 1.6 → gate = 1.0)
  cosine similarity: 0.91
  floor (85th %tile): 0.72
  ceiling (99.5th %tile): 0.95

  normalized = (0.91 - 0.72) / (0.95 - 0.72) = 0.826
  boost = 0.826 × 4 × 1.0 = 3.3
  ─────────────────────────────
  Total: lexical 3.0 + semantic 3.3 = 6.3
```

```
Query: "ချစ်တယ်" (lexical match နည်း)
Emoji: ❤️

  lexical score: 0.5 (< 0.8 → gate = 0.25)
  cosine similarity: 0.88
  normalized = 0.70
  boost = 0.70 × 4 × 0.25 = 0.7
  ─────────────────────────────
  Total: lexical 0.5 + semantic 0.7 = 1.2
```

## ၅. Cohort Boosting (အုပ်စု Boost)

Lexical နဲ့ semantic contribution တွက်ပြီးတဲ့နောက် scorer က cohort seed အားကောင်းတာတွေ ရှာပါတယ်။

### Cohort Seed Rule

Candidate တစ်ခု cohort seed ဖြစ်ဖို့:

```
lexicalScore + semanticBoost > 10
```

### Cohort Detection

Seed candidate တွေထဲက:

- `subgroup` တူတာ ၂ ခု ရှိရင် → အဲ့ `subgroup` dominant ဖြစ်
- `group` တူတာ ၂ ခု ရှိရင် → အဲ့ `group` dominant ဖြစ်

Dominant cohort ကို agree ဖြစ်တဲ့ seed တွေရဲ့ lexical strength ပေါင်းနဲ့ ရွေးပါတယ်။

### Cohort Boost တန်ဖိုးများ

| Cohort Match | Boost |
|---|---|
| Same `subgroup` | `+3.0` |
| Same `group` | `+1.5` |

### Guardrails

- ⚠️ Seed emoji ကိုယ်တိုင် cohort boost မရပါ
- ⚠️ Candidate မှာ lexical evidence ကိုယ်ပိုင် ရှိမှသာ cohort boost ရပါတယ်

#### ဥပမာ: cohort boosting

```
Query: "ပျော်ရွှင်"

Seed candidates (lexical + semantic > 10):
  😊 (subgroup: face-smiling) → score 11.2
  😁 (subgroup: face-smiling) → score 10.5

Dominant cohort: subgroup = "face-smiling"

Other candidates:
  😄 (subgroup: face-smiling) → lexical 4.0 + cohort +3.0 = 7.0 ✅
  😂 (subgroup: face-smiling) → lexical 2.0 + cohort +3.0 = 5.0 ✅
  🎉 (group: Activities) → cohort boost မရ ❌
```

## ၆. Skin Tone Behavior (အသားအရည်)

Skin-tone variant တွေ dataset ထဲ ရှိနေပေမယ့် skin tone က score ကိုယ်ပိုင် ထပ်မပေးပါ။

လက်ရှိ behavior:

- Tone query ရိုက်ထည့်ရင် filter ကူပေးပါတယ်
- ရလဒ်မှာ skin-tone family က grid ကို မရှုပ်အောင် collapse လုပ်ပါတယ်
- Default skin-tone variant ကို collapse ချိန်မှာ ဦးစားပေးပါတယ်

## ၇. Final Ranking (နောက်ဆုံး အဆင့်သတ်မှတ်ခြင်း)

Emoji တစ်ခုချင်းအတွက်:

1. Lexical score တွက်
2. Semantic boost တွက် (locale အတွက် enabled ဖြစ်ရင်)
3. `lexical + semantic > 10` ဖြစ်တဲ့ candidate တွေကနေ dominant cohort ကောက်
4. Dominant `group` သို့မဟုတ် `subgroup` ကိုက်ညီရင် cohort boost ထည့်
5. Final score ပေါင်းစည်း:

```
final = lexical + semantic + cohort
```

ပြီးရင်:

| Rule | တန်ဖိုး |
|---|---|
| မြန်မာ segmented query ▶ အနည်းဆုံး score | `> 5` |
| Generic locale query ▶ အနည်းဆုံး score | `> 4` |
| Sort | Score အမြင့်ဆုံးကနေ descending |
| Skin-tone | Query ကတမင်မတောင်းရင် collapse |
| ရလဒ်အများဆုံး | `48` |

#### ဥပမာ: final ranking

```
Query: "ပျော်ရွှင်" (Burmese)

  😊  lexical: 5.2  semantic: 4.0  cohort: 0   → final: 9.2 ✅
  😁  lexical: 4.8  semantic: 3.5  cohort: 0   → final: 8.3 ✅
  😄  lexical: 2.0  semantic: 2.0  cohort: 3.0 → final: 7.0 ✅
  🎉  lexical: 1.5  semantic: 1.0  cohort: 0   → final: 2.5 ❌ (< 5)
  🏠  lexical: 0    semantic: 0.2  cohort: 0   → final: 0.2 ❌

ရလဒ်: 😊, 😁, 😄 (score descending, threshold > 5 ဖြတ်ကျော်တာတွေသာ)
```

## ၈. Debug Logging

Browser က search တိုင်းမှာ ranking debug information ကို log ထုတ်ပါတယ်။

လက်ရှိ debug output ပါဝင်တာ:

- Query analysis details
- ရွေးထားတဲ့ search strategy
- Detect ရတဲ့ dominant `group` နဲ့ `subgroup`
- Rank ပေးထားတဲ့ ရလဒ်အားလုံး (top slice သာမဟုတ်)
- ရလဒ်တစ်ခုချင်းအတွက်:
  - lexical score
  - cohort boost
  - semantic boost
  - semantic similarity
  - final score
  - `wordTokens`

ဒီ logging ကို [lib/search-ranking.ts](../lib/search-ranking.ts) ကနေ ထုတ်ပြီး [hooks/use-semantic-search.ts](../hooks/use-semantic-search.ts) ကနေ enable လုပ်ပါတယ်။

#### ဥပမာ: debug console output

```
[Search] query="ပြုံး" strategy=burmese
[Search] dominant subgroup=face-smiling (2 seeds)
[Search] ──────────────────────────────────────
  😊  lex=5.2  cohort=0  sem=3.8  sim=0.91  final=9.0  tokens=["ပြုံး","မျက်နှာ"]
  😁  lex=4.8  cohort=0  sem=3.2  sim=0.87  final=8.0  tokens=["ပြုံး"]
  😄  lex=2.0  cohort=3  sem=1.5  sim=0.78  final=6.5  tokens=["ပြုံး","ကျယ်"]
```
