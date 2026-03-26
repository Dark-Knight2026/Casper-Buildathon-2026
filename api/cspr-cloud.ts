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
    console.error('[security] ALLOWED_ORIGIN not set in production — proxy is open to all origins');
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
  // vercel.json routes "/api/cspr-cloud/:path*" → "/api/cspr-cloud" (destination
  // intentionally omits :path* to keep routing pointed at this single file).
  // Because :path* is absent from the destination, Vercel does NOT inject
  // req.query.path — the array/string branches below are defensive guards in case
  // the routing config ever changes to "?path=:path*".
  //
  // Primary path: the req.url fallback. In Vercel serverless functions req.url
  // holds the original pre-rewrite URL (standard Node.js/Vercel behaviour), so
  // "/api/cspr-cloud/accounts/abc/ft-token-actions?foo=bar" arrives intact and
  // stripping the prefix gives the correct sub-path. This is the branch that
  // fires today in production.
  let path = '';
  if (Array.isArray(req.query.path)) {
    path = req.query.path.join('/');
  } else if (typeof req.query.path === 'string') {
    path = req.query.path;
  } else {
    // Active branch: req.url contains the original pre-rewrite path.
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
