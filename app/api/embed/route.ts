import { NextResponse } from 'next/server';

// Switch to Edge Runtime: this forces @huggingface/transformers to use the
// WASM backend (onnxruntime-web) instead of onnxruntime-node native bindings,
// which are not available in Vercel's serverless environment.
export const runtime = 'edge';

// Cache the pipeline within the warm Edge worker context
let pipelinePromise: Promise<any> | null = null;

async function getExtractor() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      try {
        const { pipeline, env } = await import('@huggingface/transformers');

        // Download model weights from Hugging Face Hub at runtime
        env.allowLocalModels = false;
        env.allowRemoteModels = true;

        const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
        return extractor;
      } catch (err) {
        // Reset so the next request can retry
        pipelinePromise = null;
        console.error("Pipeline initialization failed", err);
        throw err;
      }
    })();
  }
  return pipelinePromise;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const extractor = await getExtractor();

    // Generate the embedding for the given query text
    const output = await extractor(q.toLowerCase(), { pooling: 'mean', normalize: true });

    // Convert Float32Array to standard array for JSON serialization
    const vector = Array.from(output.data);

    return NextResponse.json({ vector });
  } catch (error) {
    console.error('Embedding generation error:', error);
    return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
  }
}
