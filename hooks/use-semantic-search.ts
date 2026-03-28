import { startTransition, useState, useEffect, useCallback, useRef } from 'react';
import { loadEmojiEmbeddings, mergeEmojiEmbeddings, type EmojiItem } from '@/lib/emoji-data';
import { getLocaleConfig } from '@/lib/locale-config';
import { type OppaWordLexicon } from '@/lib/oppa-word';
import {
  analyzeSearchQuery,
  buildSearchLexiconFromEmojiData,
  buildSemanticSignal,
  rankEmojiResults,
} from '@/lib/search-ranking';

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

function createSearchCacheKey(query: string, localeId: string, isSemantic: boolean): string {
  return `${localeId}:${isSemantic ? 'semantic' : 'lexical'}:${query}`;
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export function useSemanticSearch(allEmojis: EmojiItem[], isSemantic: boolean, localeId: string) {
  const localeConfig = getLocaleConfig(localeId);
  const [results, setResults] = useState<EmojiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const isExtracting = useRef(false);
  const lexiconRef = useRef<OppaWordLexicon | null>(null);
  const latestQuery = useRef('');
  const resultCacheRef = useRef(new Map<string, EmojiItem[]>());
  const embeddingCacheRef = useRef(new Map<string, number[]>());
  const semanticEmojisRef = useRef<EmojiItem[] | null>(null);

  useEffect(() => {
    semanticEmojisRef.current = null;
    resultCacheRef.current = new Map();
    embeddingCacheRef.current = new Map();
    setResults([]);
  }, [localeId]);

  useEffect(() => {
    semanticEmojisRef.current = null;
  }, [allEmojis]);

  useEffect(() => {
    if (allEmojis.length === 0 || localeConfig.searchStrategy !== 'burmese') {
      lexiconRef.current = null;
      return;
    }

    lexiconRef.current = buildSearchLexiconFromEmojiData(allEmojis);
  }, [allEmojis, localeConfig.searchStrategy]);

  const ensureSemanticDataset = useCallback(async () => {
    if (semanticEmojisRef.current) {
      return semanticEmojisRef.current;
    }

    setModelLoading(true);

    try {
      const embeddingMap = await loadEmojiEmbeddings(localeId);
      const merged = mergeEmojiEmbeddings(allEmojis, embeddingMap);
      semanticEmojisRef.current = merged;
      return merged;
    } finally {
      setModelLoading(false);
    }
  }, [allEmojis, localeId]);

  useEffect(() => {
    if (
      !isSemantic ||
      !localeConfig.semanticEnabled ||
      allEmojis.length === 0 ||
      semanticEmojisRef.current
    ) {
      return;
    }

    void ensureSemanticDataset().catch((error) => {
      console.error('Failed to preload semantic emoji vectors', error);
    });
  }, [allEmojis.length, ensureSemanticDataset, isSemantic, localeConfig.semanticEnabled]);

  const search = useCallback(
    async (query: string) => {
      latestQuery.current = query;
      if (!query.trim()) {
        startTransition(() => {
          setResults([]);
        });
        setIsSearching(false);
        return;
      }

      const lowerQuery = query.toLowerCase();
      const canUseSemantic = isSemantic && localeConfig.semanticEnabled;
      const cacheKey = createSearchCacheKey(lowerQuery, localeId, canUseSemantic);
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
      const queryAnalysis = analyzeSearchQuery(lowerQuery, lexicon, localeConfig.searchStrategy);

      let semanticSignal;
      let searchDataset = allEmojis;

      if (canUseSemantic) {
        if (isExtracting.current) return;

        try {
          isExtracting.current = true;
          searchDataset = await ensureSemanticDataset();
          const embeddings = await Promise.all(
            queryAnalysis.semanticViews.map(async (view) => {
              const embeddingKey = `${localeId}:${view.text}`;
              const cachedVector = embeddingCacheRef.current.get(embeddingKey);
              const vector = cachedVector
                ? cachedVector
                : await fetchEmbeddingFromAPI(view.text).then((resolvedVector) => {
                    embeddingCacheRef.current.set(embeddingKey, resolvedVector);
                    return resolvedVector;
                  });

              return {
                ...view,
                vector,
              };
            })
          );

          if (latestQuery.current !== query) {
            isExtracting.current = false;
            search(latestQuery.current);
            return;
          }

          semanticSignal = buildSemanticSignal(searchDataset, embeddings);
        } catch (error) {
          console.error('Semantic API extraction error', error);
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
    },
    [allEmojis, ensureSemanticDataset, isSemantic, localeConfig.searchStrategy, localeConfig.semanticEnabled, localeId]
  );

  return {
    modelLoading,
    results,
    search,
    isSearching,
    semanticAvailable: localeConfig.semanticEnabled,
  };
}
