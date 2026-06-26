# Casper Network Blockchain Integration

## Overview

This document provides a comprehensive guide to the Casper Network blockchain integration for the Real Estate Management Platform. The integration enables property tokenization, fractional ownership, smart lease contracts, and transparent financial operations on the Casper blockchain.

## Architecture

### Hybrid Architecture
- **Supabase**: Traditional database for user profiles, application state, and off-chain data
- **Casper Network**: Blockchain layer for property tokenization, ownership records, and smart contracts
- **CSPR.cloud**: Middleware for blockchain data indexing and API access
- **CSPR.click**: Unified wallet integration SDK
- **CSPR.name**: Web3 identity service

### Key Components

1. **Blockchain Services** (`src/lib/blockchain/`)
   - `csprCloudService.ts`: REST API and WebSocket integration with CSPR.cloud
   - `csprClickService.ts`: Wallet connectivity and transaction signing
   - `csprNameService.ts`: Web3 identity resolution and registration

2. **React Hooks** (`src/hooks/`)
   - `useWallet.ts`: Wallet connection state management
   - `useBlockchainTransaction.ts`: Transaction lifecycle management
   - `useCSPRPrice.ts`: Real-time CSPR exchange rates

3. **UI Components** (`src/components/blockchain/`)
   - `WalletConnect.tsx`: Wallet connection interface
   - Additional components for property tokenization, marketplace, etc.

4. **Database Schema** (`supabase/migrations/`)
   - Extended tables for blockchain data
   - RLS policies for secure data access
   - Triggers and functions for data consistency

## Environment Setup

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# Casper Network Configuration
VITE_CASPER_NETWORK=mainnet
VITE_CSPR_CLOUD_API_KEY=your_cspr_cloud_api_key
VITE_CSPR_CLOUD_BASE_URL=https://api.cspr.cloud
VITE_CSPR_CLOUD_WS_URL=wss://streaming.cspr.cloud
VITE_CSPR_NAME_CONTRACT_HASH=hash-of-cspr-name-contract

# Supabase Configuration (existing)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Getting API Keys

1. **CSPR.cloud API Key**:
   - Visit [console.cspr.build](https://console.cspr.build)
   - Create an account and generate an API key
   - Copy the API key to `VITE_CSPR_CLOUD_API_KEY`

2. **CSPR.name Contract Hash**:
   - Obtain from CSPR.name documentation
   - Or use the testnet contract hash for development

## Installation

### Dependencies

The following packages are required and have been added:

```bash
pnpm add axios zod
```

### Database Migration

Run the Casper blockchain integration migration:

```bash
# Using Supabase CLI
supabase migration up

# Or manually execute the SQL file in Supabase dashboard
# File: supabase/migrations/20251213000000_casper_blockchain_integration.sql
```

## Usage Guide

### 1. Wallet Connection

```typescript
import { useWallet } from '@/hooks/useWallet';

function MyComponent() {
  const { isConnected, account, connect, disconnect } = useWallet();

  return (
    <div>
      {!isConnected ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected: {account?.publicKey}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

### 2. Property Tokenization

```typescript
import { useBlockchainTransaction } from '@/hooks/useBlockchainTransaction';

function TokenizeProperty({ propertyId }) {
  const { sendTransaction, isProcessing } = useBlockchainTransaction();

  const handleTokenize = async () => {
    try {
      const txHash = await sendTransaction({
        type: 'property_mint',
        from: walletAddress,
        parameters: {
          propertyId,
          metadata: {
            property_address: '123 Main St',
            property_type: 'residential',
            // ... other metadata
          },
        },
      });
      
      console.log('Transaction hash:', txHash);
    } catch (error) {
      console.error('Tokenization failed:', error);
    }
  };

  return (
    <button onClick={handleTokenize} disabled={isProcessing}>
      {isProcessing ? 'Processing...' : 'Tokenize Property'}
    </button>
  );
}
```

### 3. CSPR Price Conversion

```typescript
import { useCSPRPrice } from '@/hooks/useCSPRPrice';

function PriceDisplay({ csprAmount }) {
  const { convertToUSD, priceUSD } = useCSPRPrice();

  return (
    <div>
      <p>{csprAmount} CSPR</p>
      <p>${convertToUSD(csprAmount).toFixed(2)} USD</p>
      <p>Current rate: ${priceUSD}</p>
    </div>
  );
}
```

## Features

### Property Tokenization (CEP-78)
- Mint property NFTs on Casper Network
- Transfer ownership with immutable history
- Store property metadata on-chain
- View ownership history on blockchain explorer

### Fractional Ownership (CEP-18)
- Create fractional ownership tokens
- Enable small-scale real estate investment
- Automated dividend distribution
- Liquid token marketplace

### Smart Lease Contracts
- Automated rent collection
- Security deposit escrow
- Lease term enforcement
- Transparent payment history

### Web3 Identity (CSPR.name)
- Human-readable blockchain addresses
- Name registration and management
- Reverse address lookup
- Enhanced user experience

## API Endpoints

### Internal API (Supabase Edge Functions)

All endpoints should be created as Supabase Edge Functions:

- `POST /api/blockchain/tokenize-property` - Mint property NFT
- `POST /api/blockchain/create-smart-lease` - Deploy lease contract
- `POST /api/blockchain/purchase-tokens` - Buy fractional tokens
- `GET /api/blockchain/transaction-status/:txHash` - Get transaction status
- `POST /api/auth/link-wallet` - Link wallet to user profile
- `GET /api/cspr-name/resolve/:name` - Resolve CSPR.name
- `GET /api/marketplace/properties` - Get tokenized properties

## Database Schema

### Key Tables

1. **blockchain_transactions**: All blockchain transactions
2. **fractional_ownership**: Fractional token contracts
3. **token_holdings**: Individual investor positions
4. **blockchain_events**: Raw blockchain events
5. **cspr_price_history**: Historical exchange rates
6. **wallet_connections**: User wallet connections
7. **cspr_names**: CSPR.name registry

### Extended Tables

- **user_profiles**: Added `wallet_address`, `cspr_name`, `kyc_status`
- **properties**: Added `nft_token_id`, `is_tokenized`, `fractional_token_contract`
- **leases**: Added `smart_contract_address`, `is_smart_contract`

## Security Considerations

### Private Key Management
- **NEVER** store private keys on servers
- All key management handled client-side by CSPR.click SDK
- Custodial wallets managed by CSPR.click infrastructure
- Hardware wallet support (Ledger) for high-security users

### Transaction Security
- Display clear transaction details before signing
- Require explicit user approval for each transaction
- Show transaction status updates in real-time
- Provide transaction history for audit trails

### API Security
- Store API keys in environment variables
- Implement rate limiting on all endpoints
- Use Row Level Security (RLS) for database access
- Audit logging for sensitive operations

## Testing

### Unit Tests

```bash
# Run unit tests
pnpm test

# Test specific service
pnpm test src/lib/blockchain/csprCloudService.test.ts
```

### Integration Tests

```bash
# Run integration tests
pnpm test:integration
```

### Manual Testing Checklist

- [ ] Wallet connection (all providers)
- [ ] Property tokenization
- [ ] Smart lease creation
- [ ] Rent payment automation
- [ ] Fractional token purchase
- [ ] CSPR.name registration
- [ ] Transaction status tracking
- [ ] Real-time event updates

## Troubleshooting

### Common Issues

1. **Wallet Connection Fails**
   - Ensure wallet extension is installed
   - Check network configuration (mainnet vs testnet)
   - Verify CSPR.click SDK initialization

2. **Transaction Pending Forever**
   - Check CSPR.cloud API status
   - Verify transaction hash on blockchain explorer
   - Ensure WebSocket connection is active

3. **Price Data Not Loading**
   - Verify CSPR.cloud API key is valid
   - Check API rate limits
   - Ensure network connectivity

## Development Roadmap

### Phase 1: Foundation (Completed)
- ✅ CSPR.cloud API integration
- ✅ CSPR.click SDK integration
- ✅ Database schema
- ✅ React hooks
- ✅ Basic UI components

### Phase 2: Core Features (In Progress)
- [ ] Property NFT minting
- [ ] Smart lease contracts
- [ ] Transaction monitoring
- [ ] Wallet authentication

### Phase 3: Advanced Features
- [ ] Fractional ownership
- [ ] Property marketplace
- [ ] CSPR.name integration
- [ ] Social login

### Phase 4: Integration
- [ ] Integrate with existing modules
- [ ] Security testing
- [ ] Performance optimization
- [ ] User acceptance testing

### Phase 5: Launch
- [ ] Mainnet deployment
- [ ] User onboarding
- [ ] Monitoring and optimization
- [ ] Feedback iteration

## Resources

- [Casper Network Documentation](https://docs.casper.network/)
- [CSPR.cloud API Docs](https://docs.cspr.cloud/)
- [CSPR.click SDK Docs](https://docs.cspr.click/)
- [CSPR.name Service](https://cspr.name/)
- [Casper Blockchain Explorer](https://cspr.live/)

## Support

For issues or questions:
1. Check this documentation
2. Review PRD: `/workspace/docs/prd/casper_integration_prd.md`
3. Review System Design: `/workspace/docs/design/casper_system_design.md`
4. Contact development team

## License

This integration is part of the Real Estate Management Platform and follows the same license terms.