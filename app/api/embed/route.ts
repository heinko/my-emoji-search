import { NextResponse } from 'next/server';

// Ensure the endpoint is treated as dynamic and not statically prerendered
export const dynamic = 'force-dynamic';

// Cache the pipeline across warm invocations in the serverless environment
let pipelinePromise: Promise<any> | null = null;

async function getExtractor() {
  if (!pipelinePromise) {
    // We instantiate the pipeline asynchronously
    pipelinePromise = (async () => {
      try {
        const { pipeline, env } = await import('@huggingface/transformers');
        
        // In a Vercel Serverless environment, we want to download from HF hub 
        // to a temporary cache so we don't exceed deployment package sizes
        env.allowLocalModels = false;
        env.allowRemoteModels = true;
        
        // Use the same model as front-end used to ensure same embedding space
        const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
        return extractor;
      } catch (err) {
        console.error("Pipeline initialization dynamically failed", err);
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
