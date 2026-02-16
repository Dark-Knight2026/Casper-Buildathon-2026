import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.CSPR_CLOUD_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const network = process.env.VITE_CASPER_NETWORK || 'casper-test';
  const rpcUrl = network === 'casper'
    ? 'https://node.cspr.cloud/rpc'
    : 'https://node.testnet.cspr.cloud/rpc';

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': API_KEY,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.text();

    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    return res.status(response.status).send(data);
  } catch (err) {
    console.error('[casper-rpc proxy] Error:', err);
    return res.status(502).json({ error: 'RPC proxy request failed' });
  }
}
