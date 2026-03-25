import Link from "next/link"

const creditSections = [
  {
    title: "Project",
    items: [
      {
        name: "Heinko",
        note: "Creator and maintainer of Burmese Emoji Search.",
      },
    ],
  },
  {
    title: "Language And Search Inspiration",
    items: [
      {
        name: "oppaWord",
        note: "Inspired the Burmese word-segmentation direction used in the search experience.",
        href: "https://github.com/ye-kyaw-thu/oppaWord",
      },
      {
        name: "sylbreak",
        note: "Reviewed during the project’s Burmese text experimentation and segmentation work.",
        href: "https://github.com/ye-kyaw-thu/sylbreak",
      },
    ],
  },
  {
    title: "Emoji And Language Data",
    items: [
      {
        name: "Unicode Emoji Data",
        note: "Provides the official emoji definitions and code points.",
        href: "https://unicode.org/Public/emoji/",
      },
      {
        name: "CLDR Myanmar Annotations",
        note: "Provides Burmese emoji names and annotation data.",
        href: "https://github.com/unicode-org/cldr",
      },
    ],
  },
  {
    title: "Model And Hosting",
    items: [
      {
        name: "intfloat/multilingual-e5-small",
        note: "Used for multilingual semantic embedding generation.",
        href: "https://huggingface.co/intfloat/multilingual-e5-small",
      },
      {
        name: "Hugging Face Spaces",
        note: "Used to host the embedding service for semantic search.",
        href: "https://huggingface.co/spaces",
      },
      {
        name: "Vercel",
        note: "Used to host the web app.",
        href: "https://vercel.com/",
      },
    ],
  },
]

export const metadata = {
  title: "Credits | Burmese Emoji Search",
  description: "Credits, sources, datasets, and tools used to build Burmese Emoji Search.",
}

export default function CreditsPage() {
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
            href="/about"
            className="rounded-full border border-border bg-card/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
        </div>

        <section className="rounded-[2rem] border border-border bg-card/80 p-6 shadow-xl md:p-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-sm text-muted-foreground">
            <span>{"📚"}</span>
            <span>Credits & Sources</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Credits, sources, and tools behind Burmese Emoji Search
            </h1>
            <p className="text-base leading-8 text-muted-foreground md:text-lg">
              This project is built with public language resources, Unicode emoji data, open-source
              tools, and hosting services. This page gives clear credit to those sources.
            </p>
          </div>
        </section>

        <div className="space-y-5">
          {creditSections.map((section) => (
            <section
              key={section.title}
              className="rounded-[1.75rem] border border-border bg-card/70 p-6 shadow-sm"
            >
              <h2 className="mb-4 text-xl font-semibold">{section.title}</h2>
              <div className="space-y-4">
                {section.items.map((item) => (
                  <article key={item.name} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="mb-2 text-base font-medium">
                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="transition-colors hover:text-primary"
                        >
                          {item.name}
                        </a>
                      ) : (
                        item.name
                      )}
                    </div>
                    <p className="text-sm leading-7 text-muted-foreground">{item.note}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
