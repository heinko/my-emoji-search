import { createServer } from 'node:http';
import { pipeline, env } from '@huggingface/transformers';

const PORT = Number(process.env.PORT || 7860);
const HOST = process.env.HOST || '0.0.0.0';
const MODEL_NAME =
  process.env.MODEL_NAME || 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const ACCESS_TOKEN = process.env.SERVICE_TOKEN;

env.allowLocalModels = false;
env.allowRemoteModels = true;

let extractorPromise = null;

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function isAuthorized(request) {
  if (!ACCESS_TOKEN) return true;

  const authHeader = request.headers.authorization;
  return authHeader === `Bearer ${ACCESS_TOKEN}`;
}

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_NAME).catch((error) => {
      extractorPromise = null;
      throw error;
    });
  }

  return extractorPromise;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    return json(response, 200, { ok: true });
  }

  if (url.pathname !== '/embed' || request.method !== 'GET') {
    return json(response, 404, { error: 'Not found' });
  }

  if (!isAuthorized(request)) {
    return json(response, 401, { error: 'Unauthorized' });
  }

  const q = url.searchParams.get('q');
  if (!q) {
    return json(response, 400, { error: 'Query parameter "q" is required' });
  }

  try {
    const extractor = await getExtractor();
    const output = await extractor(q.toLowerCase(), {
      pooling: 'mean',
      normalize: true,
    });

    return json(response, 200, { vector: Array.from(output.data) });
  } catch (error) {
    console.error('Embedding service error:', error);
    return json(response, 500, { error: 'Failed to generate embedding' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Embedding service listening on http://${HOST}:${PORT}`);
});
