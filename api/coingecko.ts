import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_COIN_IDS = new Set(['casper-network']);
const ALLOWED_CURRENCIES = new Set(['usd', 'eur', 'gbp']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ids, vs_currencies } = req.query;

  if (typeof ids !== 'string' || !ALLOWED_COIN_IDS.has(ids)) {
    return res.status(400).json({ error: 'Invalid or missing ids parameter' });
  }

  const currencies = typeof vs_currencies === 'string'
    ? vs_currencies.split(',').map((c) => c.toLowerCase())
    : [];

  if (currencies.length === 0 || currencies.some((c) => !ALLOWED_CURRENCIES.has(c))) {
    return res.status(400).json({ error: 'Invalid or missing vs_currencies parameter' });
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs_currencies}`;

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
    });

    const data = await response.text();

    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(response.status).send(data);
  } catch (err) {
    console.error('[coingecko proxy] Error:', err);
    return res.status(502).json({ error: 'Proxy request failed' });
  }
}
