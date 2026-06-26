# Wallet Integration Guide

This document covers the Casper wallet integration for the ICO application, including architecture, configuration, and debugging tips.

## Architecture Overview

The wallet integration consists of three main layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
│  (WalletCard, ActiveICO, ActivePresale, etc.)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Custom Hooks                              │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │ useICOWallet │  │useWalletBalances│  │usePurchaseFlow│  │
│  └──────────────┘  └─────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │ CSPR.click   │  │  CSPR.Cloud API │  │ Casper Network│  │
│  │    SDK       │  │  (Balances)     │  │  (Contracts)  │  │
│  └──────────────┘  └─────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Hook Responsibilities

| Hook | Purpose |
|------|---------|
| `useICOWallet` | Wallet connection state, sign-in/sign-out via CSPR.click |
| `useWalletBalances` | Fetch CSPR and token balances from CSPR.Cloud API |
| `usePurchaseToken` | Execute token purchase transactions |
| `usePurchaseFlow` | Orchestrate full purchase flow with UI state |

## CSPR.click Provider Configuration

### Setup in App Entry Point

The CSPR.click provider must wrap your application:

```tsx
// src/main.tsx or src/App.tsx
import { ClickProvider } from '@make-software/csprclick-ui';

const clickOptions = {
  appName: 'LeaseFi ICO',
  contentMode: 'iframe',
  providers: ['casper-wallet', 'ledger', 'torus-wallet'],
  chainName: import.meta.env.VITE_CASPER_NETWORK || 'casper-test',
};

function App() {
  return (
    <ClickProvider options={clickOptions}>
      <YourApp />
    </ClickProvider>
  );
}
```

### Provider Options

| Option | Description | Default |
|--------|-------------|---------|
| `appName` | Display name in wallet prompts | Required |
| `contentMode` | How wallet UI appears (`iframe`, `popup`) | `iframe` |
| `providers` | Enabled wallet providers | All available |
| `chainName` | Network (`casper`, `casper-test`) | `casper` |

### Supported Wallet Providers

- `casper-wallet` - Official Casper Wallet browser extension
- `ledger` - Ledger hardware wallet
- `torus-wallet` - Torus social login wallet

## Local Testing with Testnet

### 1. Get Testnet CSPR

Visit the [Casper Testnet Faucet](https://testnet.cspr.live/tools/faucet) to request free testnet CSPR.

### 2. Configure Environment

```bash
# .env.local
VITE_CASPER_NETWORK=casper-test
VITE_CSPR_CLOUD_API_KEY=your-testnet-api-key
```

### 3. Deploy Test Contracts

Ensure ICO contracts are deployed to testnet and update addresses in `src/constants/ico.ts`:

```typescript
export const ICO_CONFIG = {
  CASPER: {
    networkName: 'casper-test',
    // ...
  },
  CONTRACTS: {
    icoAddress: 'hash-testnet-ico-contract',
    tokenAddress: 'hash-testnet-token-contract',
    usdtAddress: 'hash-testnet-usdt-contract',
    usdcAddress: 'hash-testnet-usdc-contract',
  },
};
```

### 4. Test Token Balances

For testing token purchases, you'll need testnet stablecoins. Contact the project team for testnet USDT/USDC allocation.

## CSPR.Cloud API Setup

### API Overview

CSPR.Cloud provides REST APIs for querying Casper blockchain data without running a node.

- **Mainnet**: `https://api.cspr.cloud`
- **Testnet**: `https://api.testnet.cspr.cloud`

### Getting an API Key

1. Visit [CSPR.Cloud](https://cspr.cloud)
2. Create an account
3. Generate an API key from the dashboard
4. Add to environment variables

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /accounts/{publicKey}` | Fetch CSPR balance |
| `GET /accounts/{publicKey}/ft-token-ownership` | Fetch CEP-18 token balances |

### Rate Limits

- Free tier: 100 requests/minute
- Consider caching responses (hook uses 30-second refresh interval)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_CASPER_NETWORK` | Network name (`casper` or `casper-test`) | Yes |
| `VITE_CSPR_CLOUD_API_KEY` | CSPR.Cloud API authentication key | Yes (production) |
| `VITE_ICO_CONTRACT_HASH` | ICO contract hash | Yes |
| `VITE_TOKEN_CONTRACT_HASH` | BIG token contract hash | Yes |

### Development Proxy

In development, API requests are proxied to avoid CORS issues:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/cspr-cloud': {
        target: 'https://api.testnet.cspr.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cspr-cloud/, ''),
        headers: {
          authorization: process.env.VITE_CSPR_CLOUD_API_KEY || '',
        },
      },
    },
  },
});
```

## Common Debugging Tips

### 1. Wallet Not Connecting

**Symptoms**: `connect()` does nothing, no wallet popup appears.

**Solutions**:
- Verify CSPR.click provider wraps your app
- Check browser console for SDK errors
- Ensure wallet extension is installed and unlocked
- Try clearing browser cache/localStorage

```typescript
// Debug: Check if clickRef is available
const { clickRef } = useICOWallet();
console.log('CSPR.click SDK:', clickRef);
```

### 2. Balance Shows Zero

**Symptoms**: Connected wallet shows 0 balance for all tokens.

**Solutions**:
- Verify public key is correct format (starts with `01` or `02`)
- Check CSPR.Cloud API key is valid
- Verify network matches (testnet vs mainnet)
- Check browser Network tab for API errors

```typescript
// Debug: Log balance fetch
const { balances, error } = useWalletBalances(publicKey);
console.log('Balances:', balances, 'Error:', error);
```

### 3. Transaction Fails

**Symptoms**: Purchase transaction rejected or times out.

**Solutions**:
- Check sufficient balance (including gas fees ~2.5 CSPR)
- Verify token approval for CEP-18 tokens
- Check contract addresses are correct
- Review transaction in wallet before signing

```typescript
// Debug: Log purchase state transitions
const { purchaseState } = usePurchaseFlow({ tokenPrice, tokenSymbol });
useEffect(() => {
  console.log('Purchase step:', purchaseState.step, purchaseState.error);
}, [purchaseState]);
```

### 4. Account Hash Mismatch

**Symptoms**: Contract calls fail with "account not found" errors.

**Solutions**:
- Account hash is derived from public key, not the same as public key
- Use `deriveAccountHash()` helper or `account.accountHash` from hook
- Verify hash format: `account-hash-<64 hex chars>`

### 5. Network Mismatch

**Symptoms**: Transactions fail, contracts not found.

**Solutions**:
- Ensure wallet is connected to correct network
- Check `VITE_CASPER_NETWORK` matches deployed contracts
- Verify contract hashes are for the correct network

## Testing Checklist

- [ ] Wallet connects successfully
- [ ] Account details display correctly (public key, provider)
- [ ] CSPR balance loads
- [ ] Token balances load (USDT, USDC, BIG)
- [ ] Balances auto-refresh every 30 seconds
- [ ] Purchase modal opens when connected
- [ ] Token approval works (first purchase)
- [ ] Purchase transaction completes
- [ ] Success/error toasts display correctly
- [ ] Disconnect clears state properly

## Related Files

- `src/hooks/ico/useICOWallet.ts` - Wallet connection hook
- `src/hooks/ico/useWalletBalances.ts` - Balance fetching hook
- `src/hooks/ico/usePurchaseFlow.ts` - Purchase flow orchestration
- `src/hooks/ico/usePurchaseToken.ts` - Transaction execution
- `src/constants/ico.ts` - Configuration constants
- `src/services/ico/icoContractService.ts` - Contract interaction
