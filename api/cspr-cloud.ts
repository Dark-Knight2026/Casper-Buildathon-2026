import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.CSPR_CLOUD_API_KEY ?? '';
if (process.env.NODE_ENV === 'production' && !API_KEY) {
  console.error('[security] CSPR_CLOUD_API_KEY is not set — proxy requests will be rejected');
}
const ALLOWED_BASE_URLS = [
  'https://api.testnet.cspr.cloud',
  'https://api.cspr.cloud',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGIN) {
    return res.status(403).json({ error: 'CORS not configured' });
  }
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'Proxy not configured' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract the CSPR.Cloud API sub-path from the incoming request.
  //
  // Production path: csprCloudService.ts sends requests as
  // /api/cspr-cloud?path=deploys/${deployHash}, so req.query.path is always a
  // string in production. The typeof req.query.path === 'string' branch below
  // is the active production path.
  //
  // The vercel.json path-rewrite ("/api/cspr-cloud/:path*" → "/api/cspr-cloud")
  // was removed. The req.url fallback at the end of the if/else chain is now an
  // unused defensive guard retained in case routing ever changes back to the
  // path-segment style.
  let path = '';
  if (Array.isArray(req.query.path)) {
    path = req.query.path.join('/');
  } else if (typeof req.query.path === 'string') {
    // Active production path: ?path=<sub-path> query parameter.
    path = req.query.path;
  } else {
    // Defensive fallback: extract sub-path from req.url if no query param present.
    path = (req.url?.split('?')[0] ?? '').replace(/^\/api\/cspr-cloud\/?/, '');
  }

  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  if (/(?:\.\.|\/{2,}|%2f|%5c)/i.test(path)) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  // VITE_CASPER_NETWORK is intentionally used here (not a separate CASPER_NETWORK var).
  // Vercel injects all dashboard env vars into process.env at serverless runtime,
  // regardless of the VITE_ prefix — so this works correctly in production.
  // The VITE_ prefix also makes Vite inject the same value into the browser bundle,
  // keeping frontend and serverless in sync with a single variable.
  const network = process.env.VITE_CASPER_NETWORK || 'casper-test';
  const baseUrl = network === 'casper'
    ? 'https://api.cspr.cloud'
    : 'https://api.testnet.cspr.cloud';

  const targetUrl = new URL(`${baseUrl}/${path}`);

  // Forward query params (excluding Vercel's internal 'path' param)
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (typeof value === 'string') {
      targetUrl.searchParams.set(key, value);
    }
  }

  const normalized = `${targetUrl.origin}${targetUrl.pathname}`;

  // Validate normalized URL against allowed prefixes
  if (!ALLOWED_BASE_URLS.some((base) => normalized.startsWith(base))) {
    return res.status(403).json({ error: 'Forbidden target URL' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'accept': 'application/json',
        'authorization': API_KEY,
      },
      signal: controller.signal,
    });
    const data = await response.text();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    return res.status(response.status).send(data);
  } catch (err) {
    console.error('[cspr-cloud proxy] Error:', err);
    return res.status(502).json({ error: 'Proxy request failed' });
  } finally {
    clearTimeout(timeoutId);
  }
}
