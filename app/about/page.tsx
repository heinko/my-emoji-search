import Link from "next/link"

export const metadata = {
  title: "About | Burmese Emoji Search",
  description:
    "Learn how Burmese Emoji Search works, how the emoji data was built, and why heinko made it.",
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 md:py-14">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-full border border-border bg-card/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to Search
          </Link>
          <Link
            href="/credits"
            className="rounded-full border border-border bg-card/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Credits
          </Link>
        </div>

        <section className="rounded-[2rem] border border-border bg-card/80 p-6 shadow-xl md:p-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-sm text-muted-foreground">
            <span>{"🇲🇲"}</span>
            <span>About This Project</span>
          </div>

          <div className="space-y-5">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              How this emoji search works
            </h1>

            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              Burmese Emoji Search is a small search tool for finding emojis with Burmese or English
              words, short phrases, and everyday ideas.
            </p>

            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              The main idea is simple: people should not need to know the exact official English
              emoji name just to find the right icon. You can search more naturally and let the app
              do the matching work.
            </p>

            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              This is also a fun personal project by me, heinko, built to explore Burmese-localized
              search in a playful and useful way.
            </p>

            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              It was very much vibe coded too, with Codex helping me turn the idea into a working
              little product and v0 helping shape the UI.
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <article className="rounded-[1.75rem] border border-border bg-card/70 p-6">
            <h2 className="mb-3 text-lg font-semibold">Default search</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              By default, the app ranks emojis with a lexical search that compares your query with
              emoji names, Burmese keywords, English tokens, categories, and segmented Burmese terms.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-border bg-card/70 p-6">
            <h2 className="mb-3 text-lg font-semibold">Semantic mode</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              There is also an optional semantic mode that uses multilingual embeddings to match by
              meaning, which helps when Burmese and English ideas do not line up as exact keywords.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-border bg-card/70 p-6">
            <h2 className="mb-3 text-lg font-semibold">Result cleanup</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              The search also groups skin-tone variants and keeps the result list focused, so you get
              a cleaner set of useful matches instead of a wall of near-duplicates.
            </p>
          </article>
        </section>

        <section className="rounded-[2rem] border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-6 shadow-lg md:p-10">
          <h2 className="mb-4 text-2xl font-semibold">How the data was built</h2>
          <div className="space-y-4 text-base leading-8 text-muted-foreground">
            <p>
              The emoji list starts from the official Unicode emoji data, then adds Burmese names and
              keyword annotations from CLDR Myanmar locale files.
            </p>
            <p>
              On top of that, I added extra curated Burmese keywords so the search can better reflect
              how people actually describe feelings, objects, and situations in daily use.
            </p>
            <p>
              During the build step, the project generates a Burmese search index, splits and
              normalizes Burmese terms for matching, and also prepares semantic vectors for optional
              meaning-based search.
            </p>
            <p>
              So the overview is: official emoji source data, localized Burmese labels, extra
              hand-curated keywords, then a search index tuned to make Burmese and English emoji
              lookup feel easier.
            </p>
            <p>
              For the underlying tools, models, and data sources behind this project, visit the
              Credits page.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
