"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Copy, Check, Sparkles, Loader2, BrainCircuit, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { loadEmojiData, type EmojiItem } from "@/lib/emoji-data"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSemanticSearch } from "@/hooks/use-semantic-search"
import { toast } from "sonner"

export default function EmojiSearch() {
  const [allEmojis, setAllEmojis] = useState<EmojiItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [copiedEmoji, setCopiedEmoji] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSemantic, setIsSemantic] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 1. Load emoji index
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      const data = await loadEmojiData()
      setAllEmojis(data)
      setIsLoading(false)
    }
    init()
  }, [])

  // 2. Transformer Semantic Search Hook
  const { results, search, isSearching, modelLoading } = useSemanticSearch(allEmojis, isSemantic)

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 3. Search triggers
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      search(searchTerm)
    }, 800)
    
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchTerm, search])

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
              placeholder="မြန်မာလို ရှာဖွေပါ... (ဥပမာ - ပျော်ရွှင်ခြင်း)"
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
                onClick={() => setSearchTerm("")}
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
              disabled={isLoading}
            />
            <Label htmlFor="semantic-mode" className="flex items-center gap-1.5 cursor-pointer">
              Semantic Search (Transformers)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Uses an embedded AI sentence-transformer (MiniLM) for genuine cross-lingual deep meaning.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
          </div>
          {modelLoading && (
            <span className="text-xs text-primary animate-pulse font-medium">
              Loading AI Model...
            </span>
          )}
        </div>
      </div>

      {/* Hint Message */}
      {showHint && searchTerm.trim() === "" && !isLoading && (
        <div className="flex items-center justify-center gap-2 py-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-1">
              <Sparkles className="h-5 w-5 text-primary animate-bounce-soft" />
              <span className="text-muted-foreground">
                စာရိုက်ပြီး စတင်ရှာဖွေပါ
              </span>
              <Sparkles className="h-5 w-5 text-primary animate-bounce-soft" style={{ animationDelay: "0.5s" }} />
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-muted-foreground/60 max-w-md">
              {["ချစ်ခြင်း", "ပျော်ရွှင်ခြင်း", "အစားအသောက်", "တိရစ္ဆာန်"].map(word => (
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
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {results.map((emoji, idx) => (
              <EmojiCard
                key={`${emoji.emoji}-${idx}`}
                emoji={emoji}
                isCopied={copiedEmoji === emoji.emoji}
                onCopy={(e, name) => copyToClipboard(e, name)}
                delay={Math.min(idx * 0.02, 0.5)}
              />
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

function EmojiCard({ emoji, isCopied, onCopy, delay }: { 
  emoji: EmojiItem; 
  isCopied: boolean; 
  onCopy: (emoji: string, displayName: string) => void; 
  delay: number 
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      className={cn(
        "group relative flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all duration-200 min-h-[110px]",
        "bg-secondary/50 hover:bg-primary hover:shadow-lg",
        "active:scale-95 touch-manipulation",
        isCopied && "bg-primary ring-2 ring-primary ring-offset-2",
        "animate-pop-in"
      )}
      style={{ animationDelay: `${delay}s` }}
      onClick={() => onCopy(emoji.emoji, emoji.displayName)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={cn(
        "text-4xl md:text-5xl transition-transform duration-200",
        isHovered && "scale-110",
        isCopied && "animate-wiggle"
      )}>
        {emoji.emoji}
      </span>
      
      <span className={cn(
        "text-xs mt-2 line-clamp-2 text-center transition-colors font-medium px-0.5",
        "text-muted-foreground group-hover:text-primary-foreground",
        isCopied && "text-primary-foreground"
      )}
      style={{ lineHeight: '1.7em' }}
      >
        {emoji.displayName}
      </span>

      {isCopied && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-sm animate-pop-in">
          <Check className="h-3.5 w-3.5" />
        </div>
      )}
    </button>
  )
}
