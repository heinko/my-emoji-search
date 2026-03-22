import { useState, useEffect, useCallback, useRef } from 'react';
import { sylbreak } from '@/lib/sylbreak';
import { type EmojiItem } from '@/lib/emoji-data';

// Singleton for the transformer pipeline to ensure it only loads once
let pipelinePromise: Promise<any> | null = null;

async function getExtractor() {
  if (!pipelinePromise) {
    pipelinePromise = new Promise(async (resolve, reject) => {
      try {
        const { pipeline, env } = await import('@huggingface/transformers');
        // Do not use local files in Next.js browser, fetch directly from HF Hub
        env.allowLocalModels = false;
        env.allowRemoteModels = true;
        
        // Critical Fix for iPhone Safari Crash:
        // Limit WASM threads to 1 to prevent WebKit Memory/CPU overheat
        if (env.backends?.onnx?.wasm) {
          env.backends.onnx.wasm.numThreads = 1;
        }
        
        const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', {
          progress_callback: (info) => {
            // Optional: You could expose this to the UI to show download progress
          }
        });
        resolve(extractor);
      } catch (err) {
        console.error("Pipeline initialization failed", err);
        reject(err);
      }
    });
  }
  return pipelinePromise;
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
    if (!isSemantic) return;
    // Preload the model in the background when semantic search is toggled on
    let mounted = true;
    setModelLoading(true);
    getExtractor()
      .then(() => {
        if (mounted) setModelLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load transformer model", e);
        if (mounted) setModelLoading(false);
      });
      
    return () => { mounted = false; };
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
    const querySyllables = sylbreak(lowerQuery);
    
    // 1. Generate Query Vector if Semantic Mode
    let queryVector: number[] | null = null;
    if (isSemantic) {
      if (isExtracting.current) return; // Prevent concurrent model execution from blowing up memory
      
      try {
        isExtracting.current = true;
        const extractor = await getExtractor();
        
        // If the query changed rapidly, abort this stale execution
        if (latestQuery.current !== query) {
          isExtracting.current = false;
          // Re-trigger with latest
          search(latestQuery.current); 
          return;
        }

        const output = await extractor(lowerQuery, { pooling: 'mean', normalize: true });
        queryVector = Array.from(output.data) as number[];
      } catch (e) {
        console.error("Semantic extraction error", e);
      } finally {
        isExtracting.current = false;
      }
    }

    // 2. Score Emojis
    const scored = allEmojis.map(emoji => {
      let score = 0;
      
      // Exact Name/Keyword Match (Highest priority)
      if (
        emoji.myName.toLowerCase() === lowerQuery || 
        emoji.enName.toLowerCase() === lowerQuery ||
        emoji.keywords.some(k => k.toLowerCase() === lowerQuery)
      ) {
        score += 2.0;
      }

      // Full Substring Match (Strong boost)
      if (
        emoji.myName.toLowerCase().includes(lowerQuery) || 
        emoji.enName.toLowerCase().includes(lowerQuery) ||
        emoji.keywords.some(k => k.toLowerCase().includes(lowerQuery))
      ) {
        score += 1.0;
      }

      // Proportional Syllable Match (Medium boost for Burmese compound logic)
      const emojiSyllables = Array.from(new Set([
        ...sylbreak(emoji.myName.toLowerCase()), 
        ...emoji.keywords.flatMap(k => sylbreak(k.toLowerCase()))
      ]));
      
      let matchedSyllables = 0;
      for (const qs of querySyllables) {
        if (emojiSyllables.includes(qs)) matchedSyllables++;
      }
      
      if (querySyllables.length > 0) {
        score += (matchedSyllables / querySyllables.length) * 0.6;
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
