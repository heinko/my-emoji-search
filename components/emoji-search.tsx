"use client"

import { memo, useDeferredValue, useMemo, useState, useEffect, useRef } from "react"
import { Search, Check, Sparkles, Loader2, BrainCircuit, Info, Palette, Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { loadEmojiData, type EmojiItem } from "@/lib/emoji-data"
import { DEFAULT_LOCALE_ID, getLocaleConfig, SUPPORTED_LOCALES } from "@/lib/locale-config"
import type { QueryAnalysis } from "@/lib/search-ranking"
import {
  SKIN_TONE_LABELS,
  SKIN_TONE_ORDER,
  supportsAppleStyleSkinTonePicker,
  type SkinToneId,
  type SkinToneOption,
} from "@/lib/emoji-skin-tone"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSemanticSearch } from "@/hooks/use-semantic-search"
import { toast } from "sonner"

export default function EmojiSearch() {
  const [allEmojis, setAllEmojis] = useState<EmojiItem[]>([])
  const [localeId, setLocaleId] = useState(DEFAULT_LOCALE_ID)
  const [searchTerm, setSearchTerm] = useState("")
  const [copiedEmoji, setCopiedEmoji] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSemantic, setIsSemantic] = useState(false)
  const [preferredSkinTones, setPreferredSkinTones] = useState<Record<string, SkinToneId>>({})
  const [showHint, setShowHint] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const latestSearchTermRef = useRef("")
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const locale = useMemo(() => getLocaleConfig(localeId), [localeId])

  useEffect(() => {
    latestSearchTermRef.current = searchTerm
  }, [searchTerm])

  // 1. Load emoji index
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      const data = await loadEmojiData(localeId)
      setAllEmojis(data)
      setIsLoading(false)
    }
    init()
  }, [localeId])

  // 2. Transformer Semantic Search Hook
  const { results, search, isSearching, modelLoading, queryAnalysis, semanticAvailable } = useSemanticSearch(allEmojis, isSemantic, localeId)
  const skinToneOptionsByBase = useMemo(() => buildSkinToneOptionsMap(allEmojis), [allEmojis])
  const showBurmeseDebug =
    locale.searchStrategy === "burmese" &&
    searchTerm.trim() !== "" &&
    Boolean(queryAnalysis?.isBurmeseQuery)

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!semanticAvailable && isSemantic) {
      setIsSemantic(false)
    }
  }, [isSemantic, semanticAvailable])

  // 3. Search triggers
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      search(deferredSearchTerm)
    }, 800)
    
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [deferredSearchTerm, search])

  useEffect(() => {
    if (!latestSearchTermRef.current.trim()) return
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    search(latestSearchTermRef.current)
  }, [isSemantic, search])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      search(searchTerm)
      
      // Prevent mobile keyboard from staying open if desired
      searchInputRef.current?.blur()
    }
  }

  const copyToClipboard = (emoji: string, displayName: string) => {
    navigator.clipboard.writeText(emoji)
    setCopiedEmoji(emoji)
    toast.success(
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="flex flex-col">
          <span className="font-medium">Copied!</span>
          <span className="text-sm text-muted-foreground">{displayName}</span>
        </div>
      </div>,
      {
        duration: 2000,
      }
    )
    setTimeout(() => setCopiedEmoji(null), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-end animate-slide-up" style={{ animationDelay: "0.05s" }}>
          <div className="w-auto">
            <Select value={localeId} onValueChange={setLocaleId}>
              <SelectTrigger className="h-9 min-w-[124px] rounded-full border bg-card/80 px-3 text-xs shadow-sm">
                <div className="flex items-center gap-2 pr-2">
                  <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Language" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LOCALES.map((supportedLocale) => (
                  <SelectItem key={supportedLocale.id} value={supportedLocale.id}>
                    {supportedLocale.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search Input */}
          <div className="relative flex-1 w-full animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center gap-2">
              {isLoading || modelLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : isSemantic ? (
                <BrainCircuit className="h-5 w-5 text-primary" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </div>
            <Input
              ref={searchInputRef}
              type="text"
              disabled={isLoading}
              placeholder={locale.placeholder}
              className={cn(
                "pl-12 pr-4 py-6 text-lg rounded-2xl border-2 transition-all duration-300",
                "bg-card shadow-lg focus:shadow-xl",
                "placeholder:text-muted-foreground/60",
                "focus:border-primary focus:ring-4 focus:ring-primary/20",
                isSearching && "animate-pulse-ring"
              )}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                if (showHint) setShowHint(false)
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("")
                  setIsSemantic(false)
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
              >
                <span className="text-lg font-medium">{"×"}</span>
              </button>
            )}
          </div>


        </div>

        {/* Mode Toggle */}
        <div className="flex items-center justify-between px-2 animate-slide-up" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center space-x-2">
            <Switch 
              id="semantic-mode" 
              checked={isSemantic} 
              onCheckedChange={setIsSemantic}
              disabled={isLoading || !semanticAvailable}
            />
            <Label htmlFor="semantic-mode" className="flex items-center gap-1.5 cursor-pointer">
              Semantic Search
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Uses a remote multilingual embedding model to improve cross-lingual meaning matching.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
          </div>
          <div className="flex items-center gap-2">
            {showBurmeseDebug && queryAnalysis && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full px-3 text-xs"
                  >
                    <Info className="h-3.5 w-3.5" />
                    Query Breakdown
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto rounded-3xl p-0">
                  <DialogHeader className="border-b border-border px-6 py-5">
                    <DialogTitle>Query Breakdown</DialogTitle>
                    <DialogDescription>
                      Inspect raw syllables, recovered concepts, and semantic views for the current Burmese query.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-6">
                    <BurmeseQueryDebug analysis={queryAnalysis} />
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {!semanticAvailable ? (
              <span className="text-xs text-muted-foreground">
                Semantic search is not available for {locale.label} yet.
              </span>
            ) : modelLoading ? (
              <span className="text-xs text-primary animate-pulse font-medium">
                Loading semantic index...
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Hint Message */}
      {showHint && searchTerm.trim() === "" && !isLoading && (
        <div className="flex items-center justify-center gap-2 py-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-1">
              <Sparkles className="h-5 w-5 text-primary animate-bounce-soft" />
              <span className="text-muted-foreground">
                {locale.label === "Burmese" ? "စာရိုက်ပြီး စတင်ရှာဖွေပါ" : `Start searching in ${locale.label}`}
              </span>
              <Sparkles className="h-5 w-5 text-primary animate-bounce-soft" style={{ animationDelay: "0.5s" }} />
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground/60 max-w-md">
              {locale.examples.map(word => (
                <button 
                  key={word}
                  onClick={() => setSearchTerm(word)}
                  className="px-3 py-1 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-full transition-colors"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="bg-card rounded-3xl border-2 border-border shadow-xl p-4 md:p-6 animate-pop-in">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">
              {results.length} results found
            </span>
            <span className="text-xs text-muted-foreground/60">
              Tap to copy
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-4">
            {results.map((emoji, idx) => (
              (() => {
                const baseCodePoints = emoji.baseCodePoints ?? emoji.codePoints
                const skinToneOptions = skinToneOptionsByBase.get(baseCodePoints)
                const selectedTone = preferredSkinTones[baseCodePoints]
                const selectedOption = getSelectedSkinToneOption(emoji, skinToneOptions, selectedTone)

                return (
              <EmojiCard
                key={baseCodePoints}
                emoji={emoji}
                displayEmoji={selectedOption?.emoji ?? emoji.emoji}
                displayName={selectedOption?.displayName ?? emoji.displayName}
                isCopied={copiedEmoji === (selectedOption?.emoji ?? emoji.emoji)}
                onCopy={(e, name) => copyToClipboard(e, name)}
                onSelectSkinTone={(tone) => {
                  setPreferredSkinTones((current) => ({
                    ...current,
                    [baseCodePoints]: tone,
                  }))
                }}
                skinToneOptions={skinToneOptions}
                selectedSkinTone={selectedOption?.tone ?? emoji.skinTone ?? "default"}
                delay={Math.min(idx * 0.02, 0.5)}
              />
                )
              })()
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {searchTerm.trim() !== "" && results.length === 0 && !isSearching && !isLoading && !modelLoading && (
        <div className="text-center py-12 animate-pop-in">
          <div className="text-5xl mb-4">{"🔍"}</div>
          <p className="text-muted-foreground font-medium">No emojis found</p>
          <p className="text-foreground font-semibold mt-1">{`"${searchTerm}"`}</p>
        </div>
      )}

      {/* Searching State */}
      {isSearching && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}
    </div>
  )
}

function buildSkinToneOptionsMap(allEmojis: EmojiItem[]): Map<string, SkinToneOption[]> {
  const grouped = new Map<string, SkinToneOption[]>()

  for (const emoji of allEmojis) {
    if (!emoji.supportsSkinTonePicker || !emoji.baseCodePoints) continue

    const options = grouped.get(emoji.baseCodePoints) ?? []
    options.push({
      emoji: emoji.emoji,
      tone: emoji.skinTone ?? "default",
      displayName: emoji.displayName,
    })
    grouped.set(emoji.baseCodePoints, options)
  }

  for (const [baseCodePoints, options] of grouped.entries()) {
    const uniqueOptions = Array.from(
      new Map(options.map((option) => [option.tone, option])).values()
    ).sort(
      (left, right) => SKIN_TONE_ORDER.indexOf(left.tone) - SKIN_TONE_ORDER.indexOf(right.tone)
    )

    if (supportsAppleStyleSkinTonePicker(uniqueOptions)) {
      grouped.set(baseCodePoints, uniqueOptions)
    } else {
      grouped.delete(baseCodePoints)
    }
  }

  return grouped
}

function getSelectedSkinToneOption(
  emoji: EmojiItem,
  skinToneOptions: SkinToneOption[] | undefined,
  selectedTone: SkinToneId | undefined
): SkinToneOption | undefined {
  if (!skinToneOptions?.length) return undefined

  return (
    skinToneOptions.find((option) => option.tone === selectedTone) ??
    skinToneOptions.find((option) => option.tone === emoji.skinTone) ??
    skinToneOptions.find((option) => option.tone === "default") ??
    skinToneOptions[0]
  )
}

const EmojiCard = memo(function EmojiCard({
  emoji,
  displayEmoji,
  displayName,
  isCopied,
  onCopy,
  onSelectSkinTone,
  skinToneOptions,
  selectedSkinTone,
  delay,
}: {
  emoji: EmojiItem;
  displayEmoji: string;
  displayName: string;
  isCopied: boolean;
  onCopy: (emoji: string, displayName: string) => void;
  onSelectSkinTone: (tone: SkinToneId) => void;
  skinToneOptions?: SkinToneOption[];
  selectedSkinTone: SkinToneId;
  delay: number
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={cn(
        "group relative rounded-2xl transition-all duration-200",
        "animate-pop-in"
      )}
      style={{ animationDelay: `${delay}s` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        className={cn(
          "flex w-full flex-col items-center justify-center p-2.5 rounded-2xl transition-all duration-200 min-h-[110px]",
          "bg-secondary/50 hover:bg-primary hover:shadow-lg",
          "active:scale-95 touch-manipulation",
          isCopied && "bg-primary ring-2 ring-primary ring-offset-2"
        )}
        onClick={() => onCopy(displayEmoji, displayName)}
      >
        <span className={cn(
          "text-4xl md:text-5xl transition-transform duration-200",
          isHovered && "scale-110",
          isCopied && "animate-wiggle"
        )}>
          {displayEmoji}
        </span>
        
        <span className={cn(
          "text-xs mt-2 line-clamp-2 text-center transition-colors font-medium px-0.5",
          "text-muted-foreground group-hover:text-primary-foreground",
          isCopied && "text-primary-foreground"
        )}
        style={{ lineHeight: '1.7em' }}
        >
          {displayName}
        </span>
      </button>

      {skinToneOptions && skinToneOptions.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="absolute right-2 top-2 rounded-full bg-background/95 p-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-background hover:text-foreground"
              aria-label="Choose skin tone"
            >
              <Palette className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto rounded-2xl p-2">
            <div className="flex items-center gap-1.5">
              {skinToneOptions.map((option) => (
                <button
                  key={`${emoji.baseCodePoints}-${option.tone}`}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl border text-2xl transition-all hover:scale-105",
                    selectedSkinTone === option.tone
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  )}
                  onClick={() => {
                    onSelectSkinTone(option.tone)
                    onCopy(option.emoji, option.displayName)
                  }}
                  title={SKIN_TONE_LABELS[option.tone]}
                >
                  {option.emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {isCopied && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-sm animate-pop-in">
          <Check className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  )
})

function BurmeseQueryDebug({ analysis }: { analysis: QueryAnalysis }) {
  return (
    <div className="space-y-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Query Breakdown</span>
        <span className="text-xs text-muted-foreground">Live Burmese analysis</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <DebugChipGroup
          label="sylbreak"
          description="Raw syllables from compact query"
          values={analysis.syllables}
        />
        <DebugChipGroup
          label="expandedTerms"
          description="Recovered concepts used for search"
          values={analysis.expandedTerms}
        />
      </div>

      <div className="mt-3 rounded-2xl bg-secondary/50 p-3">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          semanticViews
        </div>
        <div className="flex flex-wrap gap-2">
          {analysis.semanticViews.map((view) => (
            <span
              key={`${view.text}-${view.weight}`}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground"
            >
              {view.text}
              <span className="ml-2 text-muted-foreground">{view.weight.toFixed(2)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function DebugChipGroup({
  label,
  description,
  values,
}: {
  label: string
  description: string
  values: string[]
}) {
  return (
    <div className="rounded-2xl bg-secondary/50 p-3">
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      <div className="mt-3 flex min-h-12 flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              key={`${label}-${value}`}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">None</span>
        )}
      </div>
    </div>
  )
}
