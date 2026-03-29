import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

type CreditItem = {
  href?: string
  name: string
  note: string
  citation?: string
}

const creditSections: Array<{ title: string; items: CreditItem[] }> = [
  {
    title: "Created By",
    items: [
      {
        name: "Heinko Lwin",
        note: "Creator of Myanmar Emoji Search.",
      },
      {
        name: "Source Code",
        note: "Open-source repository on GitHub.",
        href: "https://github.com/heinko/my-emoji-search",
      },
    ],
  },
  {
    title: "Built With",
    items: [
      {
        name: "Codex & v0",
        note: "Vibe coded with help from Codex and v0.",
      },
      {
        name: "Next.js on Vercel",
        note: "Web framework and hosting platform.",
        href: "https://vercel.com/",
      },
    ],
  },
  {
    title: "Research & NLP",
    items: [
      {
        name: "sylbreak",
        note: "Syllable segmentation tool for Myanmar language by Ye Kyaw Thu. Used as the base syllable layer for search normalization.",
        href: "https://github.com/ye-kyaw-thu/sylbreak",
        citation: "@misc{sylbreak,\n  author       = {Ye Kyaw Thu},\n  title        = {{sylbreak: A syllable segmentation tool for Myanmar language}},\n  publisher    = {GitHub},\n  url          = {https://github.com/ye-kyaw-thu/sylbreak}\n}",
      },
      {
        name: "intfloat/multilingual-e5-small",
        note: "Multilingual sentence embedding model used for semantic search.",
        href: "https://huggingface.co/intfloat/multilingual-e5-small",
      },
    ],
  },
  {
    title: "Language Data",
    items: [
      {
        name: "Unicode Emoji Data",
        note: "Official emoji definitions and code points.",
        href: "https://unicode.org/Public/emoji/",
      },
      {
        name: "Myanmar Contributors to CLDR",
        note: "Burmese emoji name and keyword annotations.",
        href: "https://github.com/unicode-org/cldr",
      },
      {
        name: "Shan Institute of Information Technology (SIIT)",
        note: "Shan emoji annotations. The latest shn-cldr is obtained from the Unicode CLDR repository.",
        href: "https://github.com/SIIT-ORG/shn-cldr",
      },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      {
        name: "Hugging Face Spaces",
        note: "Hosts the embedding service for semantic search.",
        href: "https://huggingface.co/spaces",
      },
    ],
  },
]

export const metadata = {
  title: "Credits | Myanmar Emoji Search",
  description: "Credits, sources, datasets, and tools used to build Myanmar Emoji Search.",
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
              Credits, sources, and tools behind Myanmar Emoji Search
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
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
                        >
                          {item.name}
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </a>
                      ) : (
                        item.name
                      )}
                    </div>
                    <p className="text-sm leading-7 text-muted-foreground">{item.note}</p>
                    {item.citation && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                          Citation
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-background/80 p-3 text-xs leading-5 text-muted-foreground">
                          <code>{item.citation}</code>
                        </pre>
                      </details>
                    )}
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
