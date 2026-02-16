import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.CSPR_CLOUD_API_KEY || '';
const ALLOWED_BASE_URLS = [
  'https://api.testnet.cspr.cloud',
  'https://api.cspr.cloud',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path } = req.query;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  // Pick base URL based on network env var
  const network = process.env.VITE_CASPER_NETWORK || 'casper-test';
  const baseUrl = network === 'casper'
    ? 'https://api.cspr.cloud'
    : 'https://api.testnet.cspr.cloud';

  const targetUrl = `${baseUrl}/${path}`;

  // Validate target URL
  if (!ALLOWED_BASE_URLS.some((base) => targetUrl.startsWith(base))) {
    return res.status(403).json({ error: 'Forbidden target URL' });
  }

  try {
    const response = await fetch(targetUrl, {
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
