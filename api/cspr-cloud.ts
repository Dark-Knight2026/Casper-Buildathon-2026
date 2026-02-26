import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.VITE_CSPR_CLOUD_API_KEY || process.env.CSPR_CLOUD_API_KEY || '';
const ALLOWED_BASE_URLS = [
  'https://api.testnet.cspr.cloud',
  'https://api.cspr.cloud',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract path: Vercel rewrite /:path* passes segments as req.query.path (array)
  let path = '';
  if (Array.isArray(req.query.path)) {
    path = req.query.path.join('/');
  } else if (typeof req.query.path === 'string') {
    path = req.query.path;
  } else {
    // Fallback: extract from URL directly
    path = (req.url?.split('?')[0] ?? '').replace(/^\/api\/cspr-cloud\/?/, '');
  }

  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  if (/(?:\.\.|\/{2,}|%2f|%5c)/i.test(path)) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  // Pick base URL based on network env var
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

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'accept': 'application/json',
        'authorization': API_KEY,
      },
    });

    const data = await response.text();

    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    return res.status(response.status).send(data);
  } catch (err) {
    console.error('[cspr-cloud proxy] Error:', err);
    return res.status(502).json({ error: 'Proxy request failed' });
  }
}
