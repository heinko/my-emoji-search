import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

let pipelinePromise: Promise<any> | null = null;

async function getExtractor() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      try {
        const { pipeline, env } = await import('@huggingface/transformers');

        env.allowLocalModels = false;
        env.allowRemoteModels = true;

        return await pipeline(
          'feature-extraction',
          'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
        );
      } catch (error) {
        pipelinePromise = null;
        console.error('Pipeline initialization failed:', error);
        throw error;
      }
    })();
  }

  return pipelinePromise;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  try {
    const extractor = await getExtractor();
    const output = await extractor(q.toLowerCase(), {
      pooling: 'mean',
      normalize: true,
    });
    const vector = Array.from(output.data);

    return NextResponse.json({ vector });
  } catch (error) {
    console.error('Embedding generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
}
