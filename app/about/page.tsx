import Link from "next/link"

export const metadata = {
  title: "About | Burmese Emoji Search",
  description: "About Burmese Emoji Search, a Burmese and English emoji finder built for faster emoji search.",
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
              Burmese and English emoji search made simple
            </h1>

            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              Burmese Emoji Search helps people find emojis with Burmese and English keywords,
              phrases, and everyday expressions.
            </p>

            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              The goal is to make emoji search faster and more natural, without needing to guess the
              exact English emoji name.
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <article className="rounded-[1.75rem] border border-border bg-card/70 p-6">
            <h2 className="mb-3 text-lg font-semibold">Made for everyday use</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Built for chat, social posts, comments, and reactions with a fast, simple search
              experience.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-border bg-card/70 p-6">
            <h2 className="mb-3 text-lg font-semibold">Built with Burmese in mind</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Includes Burmese words, phrases, and curated search terms to better match real usage.
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-border bg-card/70 p-6">
            <h2 className="mb-3 text-lg font-semibold">A portfolio project</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              Also showcases how localized Burmese search can feel practical, useful, and easy to use.
            </p>
          </article>
        </section>

        <section className="rounded-[2rem] border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-6 shadow-lg md:p-10">
          <h2 className="mb-4 text-2xl font-semibold">What visitors should know</h2>
          <div className="space-y-4 text-base leading-8 text-muted-foreground">
            <p>
              Type a word, feeling, or idea in Burmese or English to quickly browse matching emojis.
            </p>
            <p>
              Some results are direct and some reflect everyday Burmese expressions. That mix is
              intentional and helps search feel more natural.
            </p>
            <p>
              For the tools, datasets, and language resources behind the project, visit the Credits
              page.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
