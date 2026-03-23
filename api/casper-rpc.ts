import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.VITE_CSPR_CLOUD_API_KEY || process.env.CSPR_CLOUD_API_KEY || '';

const ALLOWED_RPC_METHODS = new Set([
  'query_global_state',
  'state_get_dictionary_item',
  'state_get_balance',
  'query_balance',
  'info_get_deploy',
  'account_put_deploy',
  'state_get_entity',
  'info_get_account_info',
  'info_get_status',
  'chain_get_state_root_hash',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rpcMethod = req.body?.method;
  if (typeof rpcMethod !== 'string' || !ALLOWED_RPC_METHODS.has(rpcMethod)) {
    return res.status(403).json({ error: `RPC method not allowed: ${rpcMethod}` });
  }

  const network = process.env.VITE_CASPER_NETWORK || 'casper-test';
  const rpcUrl = network === 'casper'
    ? 'https://node.cspr.cloud/rpc'
    : 'https://node.testnet.cspr.cloud/rpc';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': API_KEY,
      },
      body: JSON.stringify(req.body),
      signal: controller.signal,
    });
    const data = await response.text();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    return res.status(response.status).send(data);
  } catch (err) {
    console.error('[casper-rpc proxy] Error:', err);
    return res.status(502).json({ error: 'RPC proxy request failed' });
  } finally {
    clearTimeout(timeoutId);
  }
}
