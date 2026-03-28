import Link from "next/link"

export const metadata = {
  title: "About | Myanmar Emoji Search",
  description:
    "Learn how Myanmar Emoji Search works, how the locale-aware emoji data was built, and why heinko made it.",
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
              From research to product
            </h1>

            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              My background is in software engineering, not academic research. But I have
              always wanted to take the work that researchers have done for Burmese NLP —
              especially{" "}
              <strong>Sayar Ye Kyaw Thu</strong> and his team — and apply it to practical,
              everyday products.
            </p>

            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              This project is a showcase of exactly that. With emerging advancements in
              generative AI, it takes far less time to start building on what researchers
              have published. <b>The gap between a research paper and a working product
                is smaller than ever.</b>
            </p>

            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              That is also why I intentionally ask the AI to generate detailed documentation — covering the
              architecture, how scoring works, and how Burmese segmentation fits in. You
              can read it in the{" "}
              <a
                href="https://github.com/heinko/my-emoji-search/tree/main/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 transition-colors hover:text-foreground"
              >
                docs folder
              </a>{" "}
              of the repo for a deeper look at how everything works under the hood.
            </p>

            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              Community contributions gave us the emoji dataset annotations. NLP
              researchers gave us the segmentation tools that make Burmese text searchable.
              And generative AI made it possible for me to connect all of these pieces
              into one working tool in a short amount of time.
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <article className="rounded-[1.75rem] border border-border bg-card/70 p-6">
            <h2 className="mb-3 text-lg font-semibold">Lexical search</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              By default, the app uses lexical search — matching your query against emoji names,
              keywords, categories, and segmented Burmese terms. English keywords are always
              available as a fallback in every locale.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-border bg-card/70 p-6">
            <h2 className="mb-3 text-lg font-semibold">Semantic mode</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              An optional semantic mode uses multilingual embeddings to match by meaning.
              This helps when the word you typed is not an exact keyword but still
              describes what you are looking for.
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
              The emoji list starts from the official Unicode emoji data, then adds
              locale-specific names and keyword annotations from CLDR files for each
              supported language.
            </p>
            <p>
              On top of that, I added extra curated keywords so the search better reflects
              how people actually describe feelings, objects, and situations in daily life.
              These extra keywords were generated with Gemini through the{" "}
              <code className="rounded bg-background/80 px-1.5 py-0.5 text-sm">=AI()</code>{" "}
              function in Google Sheets.
            </p>
            <p>
              During the build step, the project generates one search index per locale,
              keeps English keywords available across all locales, and prepares semantic
              vectors for locales that support meaning-based search.
            </p>
            <p>
              In short: official emoji data → localized labels → AI-curated keywords →
              a locale-aware search index tuned to make emoji lookup feel natural.
            </p>
            <p>
              For the full list of tools, models, and data sources, visit the{" "}
              <Link href="/credits" className="underline underline-offset-4 transition-colors hover:text-foreground">Credits</Link>{" "}
              page.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
