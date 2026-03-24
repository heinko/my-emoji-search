import { useState, useEffect, useCallback, useRef } from 'react';
import { sylbreak } from '@/lib/sylbreak';
import { type EmojiItem } from '@/lib/emoji-data';

// Fetch the embedding generation from our Next.js API route
async function fetchEmbeddingFromAPI(query: string): Promise<number[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/embed?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch embedding from server API');
  }
  const data = await response.json();
  if (data.vector && Array.isArray(data.vector)) {
    return data.vector;
  }
  throw new Error('Invalid embedding format returned from API');
}

function cosineSimilarity(v1: number[] | Float32Array, v2: number[] | Float32Array): number {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    mA += v1[i] * v1[i];
    mB += v2[i] * v2[i];
  }
  const denominator = Math.sqrt(mA) * Math.sqrt(mB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export function useSemanticSearch(allEmojis: EmojiItem[], isSemantic: boolean) {
  const [results, setResults] = useState<EmojiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const isExtracting = useRef(false);
  const latestQuery = useRef("");

  useEffect(() => {
    // The model is now hosted on the server, so we don't need to preload it locally.
    if (isSemantic) setModelLoading(false);
  }, [isSemantic]);

  const search = useCallback(async (query: string) => {
    latestQuery.current = query;
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase();
    const isBurmeseQuery = /[\u1000-\u109F]/.test(lowerQuery);
    const querySyllables = isBurmeseQuery ? sylbreak(lowerQuery) : [];

    // 1. Generate Query Vector if Semantic Mode
    let queryVector: number[] | null = null;
    if (isSemantic) {
      if (isExtracting.current) return; // Prevent concurrent API fetching queue

      try {
        isExtracting.current = true;
        const vector = await fetchEmbeddingFromAPI(lowerQuery);

        // If the query changed rapidly while awaiting network, abort this stale execution
        if (latestQuery.current !== query) {
          isExtracting.current = false;
          // Re-trigger with latest
          search(latestQuery.current);
          return;
        }

        queryVector = vector;
      } catch (e) {
        console.error("Semantic API extraction error", e);
      } finally {
        isExtracting.current = false;
      }
    }

    // 2. Score Emojis
    const scored = allEmojis.map(emoji => {
      let score = 0;

      const myNameLower = emoji.myName ? emoji.myName.toLowerCase() : "";
      const enNameLower = emoji.enName ? emoji.enName.toLowerCase() : "";

      // Exact Name/Keyword Match (Highest priority)
      if (
        (myNameLower && myNameLower === lowerQuery) ||
        (enNameLower && enNameLower === lowerQuery) ||
        (emoji.keywords && emoji.keywords.some(k => k.toLowerCase() === lowerQuery))
      ) {
        score += 2.0;
      }

      // Full Substring Match (Strong boost)
      if (
        (myNameLower && myNameLower.includes(lowerQuery)) ||
        (enNameLower && enNameLower.includes(lowerQuery)) ||
        (emoji.keywords && emoji.keywords.some(k => k.toLowerCase().includes(lowerQuery)))
      ) {
        score += 1.0;
      }

      if (isBurmeseQuery) {
        // Proportional Syllable Match (Medium boost for Burmese compound logic)
        const emojiSyllables = emoji.syllables || [];
        let matchedSyllables = 0;
        for (const qs of querySyllables) {
          if (emojiSyllables.includes(qs)) matchedSyllables++;
        }

        if (querySyllables.length > 0) {
          score += (matchedSyllables / querySyllables.length) * 0.6;
        }
      } else {
        // English Word Match (Boost for English Queries)
        const queryWords = lowerQuery.split(/\s+/).filter(Boolean);
        let matchedWords = 0;
        if (queryWords.length > 0) {
          for (const qw of queryWords) {
            if (
              (enNameLower && enNameLower.includes(qw)) ||
              (emoji.keywords && emoji.keywords.some(k => k.toLowerCase().includes(qw)))
            ) {
              matchedWords++;
            }
          }
          score += (matchedWords / queryWords.length) * 0.8;
        }
      }

      // Semantic Similarity (The Modern Approach)
      if (isSemantic && queryVector && emoji.embedding && emoji.embedding.length > 0) {
        const similarity = cosineSimilarity(queryVector, emoji.embedding);

        // Multi-Lingual Transformer similarities typically run very high (0.6 to 0.9 for related topics)
        // We boost highly semantic concepts confidently to the top.
        if (similarity > 0.6) {
          score += similarity * 3.0;
        } else if (similarity > 0.45) {
          score += similarity * 1.5;
        }
      }

      return { ...emoji, score };
    })
      .filter(e => e.score > 0.45)
      .sort((a, b) => b.score! - a.score!)
      .slice(0, 48);

    setResults(scored);
    setIsSearching(false);
  }, [allEmojis, isSemantic]);

  return { results, search, isSearching, modelLoading };
}
