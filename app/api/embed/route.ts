import { NextResponse } from 'next/server';

export const runtime = 'edge';

const DEFAULT_EMBEDDING_SERVICE_URL =
  'https://heink0-burmese-emoji-embed-service.hf.space';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  const serviceUrl =
    process.env.EMBEDDING_SERVICE_URL || DEFAULT_EMBEDDING_SERVICE_URL;

  const endpoint = new URL('/embed', serviceUrl);
  endpoint.searchParams.set('q', q.toLowerCase());

  const token = process.env.EMBEDDING_SERVICE_TOKEN;

  try {
    const response = await fetch(endpoint, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Embedding service error:', errorText);
      return NextResponse.json(
        { error: 'Embedding service request failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    if (!data.vector || !Array.isArray(data.vector)) {
      return NextResponse.json(
        { error: 'Invalid embedding format returned from service' },
        { status: 502 }
      );
    }

    return NextResponse.json({ vector: data.vector });
  } catch (error) {
    console.error('Embedding generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
}
