import { startTransition, useState, useEffect, useCallback, useRef } from 'react';
import { loadEmojiEmbeddings, mergeEmojiEmbeddings, type EmojiItem } from '@/lib/emoji-data';
import { type OppaWordLexicon } from '@/lib/oppa-word';
import {
  analyzeSearchQuery,
  buildSearchLexiconFromEmojiData,
  buildSemanticSignal,
  rankEmojiResults,
} from '@/lib/search-ranking';

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

function createSearchCacheKey(query: string, isSemantic: boolean): string {
  return `${isSemantic ? 'semantic' : 'lexical'}:${query}`;
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export function useSemanticSearch(allEmojis: EmojiItem[], isSemantic: boolean) {
  const [results, setResults] = useState<EmojiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const isExtracting = useRef(false);
  const lexiconRef = useRef<OppaWordLexicon | null>(null);
  const latestQuery = useRef("");
  const resultCacheRef = useRef(new Map<string, EmojiItem[]>());
  const embeddingCacheRef = useRef(new Map<string, number[]>());
  const semanticEmojisRef = useRef<EmojiItem[] | null>(null);

  useEffect(() => {
    semanticEmojisRef.current = null;
  }, [allEmojis]);

  useEffect(() => {
    if (allEmojis.length === 0) return;
    lexiconRef.current = buildSearchLexiconFromEmojiData(allEmojis);
  }, [allEmojis]);

  const ensureSemanticDataset = useCallback(async () => {
    if (semanticEmojisRef.current) {
      return semanticEmojisRef.current;
    }

    setModelLoading(true);

    try {
      const embeddingMap = await loadEmojiEmbeddings();
      const merged = mergeEmojiEmbeddings(allEmojis, embeddingMap);
      semanticEmojisRef.current = merged;
      return merged;
    } finally {
      setModelLoading(false);
    }
  }, [allEmojis]);

  useEffect(() => {
    if (!isSemantic || allEmojis.length === 0 || semanticEmojisRef.current) return;

    void ensureSemanticDataset().catch((error) => {
      console.error('Failed to preload semantic emoji vectors', error);
    });
  }, [allEmojis.length, ensureSemanticDataset, isSemantic]);

  const search = useCallback(async (query: string) => {
    latestQuery.current = query;
    if (!query.trim()) {
      startTransition(() => {
        setResults([]);
      });
      setIsSearching(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const cacheKey = createSearchCacheKey(lowerQuery, isSemantic);
    const cachedResults = resultCacheRef.current.get(cacheKey);

    if (cachedResults) {
      startTransition(() => {
        setResults(cachedResults);
      });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const lexicon = lexiconRef.current ?? buildSearchLexiconFromEmojiData(allEmojis);
    const queryAnalysis = analyzeSearchQuery(lowerQuery, lexicon);

    let semanticSignal;
    let searchDataset = allEmojis;
    if (isSemantic) {
      if (isExtracting.current) return; // Prevent concurrent API fetching queue

      try {
        isExtracting.current = true;
        searchDataset = await ensureSemanticDataset();
        const embeddings = await Promise.all(
          queryAnalysis.semanticViews.map(async (view) => {
            const cachedVector = embeddingCacheRef.current.get(view.text);
            const vector = cachedVector
              ? cachedVector
              : await fetchEmbeddingFromAPI(view.text).then((resolvedVector) => {
                  embeddingCacheRef.current.set(view.text, resolvedVector);
                  return resolvedVector;
                });

            return {
              ...view,
              vector,
            };
          })
        );

        // If the query changed rapidly while awaiting network, abort this stale execution
        if (latestQuery.current !== query) {
          isExtracting.current = false;
          // Re-trigger with latest
          search(latestQuery.current);
          return;
        }

        semanticSignal = buildSemanticSignal(searchDataset, embeddings);
      } catch (e) {
        console.error("Semantic API extraction error", e);
      } finally {
        isExtracting.current = false;
      }
    }

    await yieldToBrowser();
    const scored = rankEmojiResults(searchDataset, lowerQuery, queryAnalysis, semanticSignal, {
      debug: typeof window !== 'undefined',
    });
    resultCacheRef.current.set(cacheKey, scored);
    startTransition(() => {
      setResults(scored);
    });
    setIsSearching(false);
  }, [allEmojis, ensureSemanticDataset, isSemantic]);

  return { results, search, isSearching, modelLoading };
}
