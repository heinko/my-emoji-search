import Link from "next/link"

export const metadata = {
  title: "About | Myanmar Emoji Search",
  description:
    "A short overview of how Myanmar Emoji Search is built and how the search works.",
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

          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              A localized emoji search engine
            </h1>
            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              Myanmar Emoji Search helps people find emojis using localized languages.
              It currently supports Burmese, Shan, and English, with more local languages
              planned only when dependable emoji annotations are available. The app combines
              locale-aware emoji data, Burmese syllable analysis, and optional semantic
              search so queries can match both exact keywords and broader meaning.
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <article className="rounded-[1.75rem] border border-border bg-card/70 p-6">
            <h2 className="mb-3 text-lg font-semibold">1. Analyze the query</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Burmese queries are compacted, split into syllables with <code className="rounded bg-background/80 px-1.5 py-0.5 text-sm">sylbreak</code>,
              and then expanded into likely concept phrases such as compound words or short
              action phrases.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-border bg-card/70 p-6">
            <h2 className="mb-3 text-lg font-semibold">2. Rank emoji results</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              The app scores emoji names, keywords, contributor terms, and recovered Burmese
              concepts in the browser. Skin-tone variants are grouped so results stay focused.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-border bg-card/70 p-6">
            <h2 className="mb-3 text-lg font-semibold">3. Add semantic search</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              In Burmese semantic mode, the app embeds the query and recovered concept views,
              compares them with prebuilt emoji vectors, and boosts results by meaning instead
              of exact wording alone. English also supports semantic mode through the generic
              search path, while Shan currently stays lexical-only.
            </p>
          </article>
        </section>

        <section className="rounded-[2rem] border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-6 shadow-lg md:p-10">
          <h2 className="mb-4 text-2xl font-semibold">How it was built</h2>
          <div className="space-y-4 text-base leading-8 text-muted-foreground">
            <p>
              The emoji dataset starts with official Unicode emoji data, then adds CLDR names
              and keywords for each supported language. Extra curated keywords are layered on
              top to make search feel more natural in real use.
            </p>
            <p>
              During the build step, the project generates one locale-aware search index per
              language and prepares semantic vectors only for locales that currently support
              meaning-based search.
            </p>
            <p>
              The result is a lightweight search app: most ranking happens locally in the
              browser, while semantic mode only calls the embedding service when you turn it on.
            </p>
            <p>
              If you want the full technical details, check the docs in the repository or visit
              the{" "}
              <Link href="/credits" className="underline underline-offset-4 transition-colors hover:text-foreground">
                Credits
              </Link>{" "}
              page for sources and tools.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
