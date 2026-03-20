"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Copy, Check, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { emojiData } from "@/lib/emoji-data"
import { cn } from "@/lib/utils"

type EmojiItem = typeof emojiData[number]

export default function EmojiSearch() {
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<EmojiItem[]>([])
  const [copiedEmoji, setCopiedEmoji] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Debounced search for performance
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(() => {
      const filteredResults = emojiData.filter(
        (emoji) =>
          emoji.burmeseKeywords.some((keyword) => 
            keyword.toLowerCase().includes(searchTerm.toLowerCase())
          ) ||
          emoji.burmeseName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setResults(filteredResults)
      setIsSearching(false)
    }, 150)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const copyToClipboard = useCallback(async (emoji: string) => {
    try {
      await navigator.clipboard.writeText(emoji)
      setCopiedEmoji(emoji)
      setTimeout(() => setCopiedEmoji(null), 1500)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = emoji
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopiedEmoji(emoji)
      setTimeout(() => setCopiedEmoji(null), 1500)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    if (showHint) setShowHint(false)
  }

  const handleEmojiClick = (emoji: string) => {
    copyToClipboard(emoji)
  }

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search className="h-5 w-5" />
        </div>
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="အငိုမျက်လုံး အပြုံးမျက်နှာ..."
          className={cn(
            "pl-12 pr-4 py-6 text-lg rounded-2xl border-2 transition-all duration-300",
            "bg-card shadow-lg focus:shadow-xl",
            "placeholder:text-muted-foreground/60",
            "focus:border-primary focus:ring-4 focus:ring-primary/20",
            isSearching && "animate-pulse-ring"
          )}
          value={searchTerm}
          onChange={handleInputChange}
          autoComplete="off"
          spellCheck={false}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
            aria-label="Clear search"
          >
            <span className="text-lg font-medium">{"×"}</span>
          </button>
        )}
      </div>

      {/* Hint Message */}
      {showHint && searchTerm.trim() === "" && (
        <div className="flex items-center justify-center gap-2 py-8 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-1">
              <Sparkles className="h-5 w-5 text-primary animate-bounce-soft" />
              <span className="text-muted-foreground">Start typing in Burmese</span>
              <Sparkles className="h-5 w-5 text-primary animate-bounce-soft" style={{ animationDelay: "0.5s" }} />
            </div>
            <div className="flex gap-2 text-sm text-muted-foreground/60">
              <span>Try:</span>
              <button 
                onClick={() => setSearchTerm("ပြုံး")}
                className="px-3 py-1 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-full transition-colors"
              >
                ပြုံး
              </button>
              <button 
                onClick={() => setSearchTerm("ချစ်")}
                className="px-3 py-1 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-full transition-colors"
              >
                ချစ်
              </button>
              <button 
                onClick={() => setSearchTerm("မြန်မာ")}
                className="px-3 py-1 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-full transition-colors"
              >
                မြန်မာ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="bg-card rounded-3xl border-2 border-border shadow-xl p-4 md:p-6 animate-pop-in">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">
              {results.length} emoji{results.length !== 1 ? "s" : ""} found
            </span>
            <span className="text-xs text-muted-foreground/60">
              Tap to copy
            </span>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-3">
            {results.map((emoji, index) => (
              <EmojiCard
                key={emoji.emoji}
                emoji={emoji}
                isCopied={copiedEmoji === emoji.emoji}
                onCopy={handleEmojiClick}
                delay={index * 0.03}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchTerm.trim() !== "" && results.length === 0 && !isSearching && (
        <div className="text-center py-12 animate-pop-in">
          <div className="text-5xl mb-4">{"🔍"}</div>
          <p className="text-muted-foreground font-medium">
            No emojis found for
          </p>
          <p className="text-foreground font-semibold mt-1">
            {`"${searchTerm}"`}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-3">
            Try a different Burmese word
          </p>
        </div>
      )}

      {/* Loading State */}
      {isSearching && searchTerm.trim() !== "" && (
        <div className="flex justify-center py-8">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}
    </div>
  )
}

interface EmojiCardProps {
  emoji: EmojiItem
  isCopied: boolean
  onCopy: (emoji: string) => void
  delay: number
}

function EmojiCard({ emoji, isCopied, onCopy, delay }: EmojiCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  return (
    <button
      className={cn(
        "group relative flex flex-col items-center justify-center p-3 md:p-4 rounded-2xl transition-all duration-200",
        "bg-secondary/50 hover:bg-primary hover:shadow-lg",
        "active:scale-95 touch-manipulation",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isCopied && "bg-primary ring-2 ring-primary ring-offset-2",
        "animate-pop-in"
      )}
      style={{ animationDelay: `${delay}s` }}
      onClick={() => onCopy(emoji.emoji)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsPressed(false)
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      aria-label={`Copy ${emoji.burmeseName}`}
    >
      <span 
        className={cn(
          "text-3xl md:text-4xl transition-transform duration-200",
          isHovered && !isPressed && "scale-110",
          isPressed && "scale-95",
          isCopied && "animate-wiggle"
        )}
      >
        {emoji.emoji}
      </span>
      
      <span className={cn(
        "text-xs mt-2 line-clamp-1 text-center transition-colors",
        "text-muted-foreground group-hover:text-primary-foreground",
        isCopied && "text-primary-foreground"
      )}>
        {emoji.burmeseName}
      </span>

      {/* Copy indicator */}
      <div className={cn(
        "absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-200",
        isCopied 
          ? "bg-accent text-accent-foreground scale-100 opacity-100" 
          : "scale-0 opacity-0"
      )}>
        <Check className="h-3 w-3" />
      </div>

      {/* Hover copy hint */}
      <div className={cn(
        "absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200",
        "bg-foreground/10 backdrop-blur-sm",
        isHovered && !isCopied ? "scale-100 opacity-100" : "scale-0 opacity-0"
      )}>
        <Copy className="h-3 w-3 text-foreground/60" />
      </div>
    </button>
  )
}
