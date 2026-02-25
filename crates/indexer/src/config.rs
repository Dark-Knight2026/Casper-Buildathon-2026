//! Indexer configuration loaded from environment variables.

use std::env;

use secrecy::SecretString;

use crate::error::IndexerError;

/// Default delay between REST API requests in milliseconds.
const DEFAULT_BACKFILL_RATE_LIMIT_MS: u64 = 200;
/// Default initial WebSocket reconnect delay in milliseconds.
const DEFAULT_WSS_RECONNECT_DELAY_MS: u64 = 1000;

/// Indexer configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct IndexerConfig {
    /// `PostgreSQL` database connection URL.
    pub database_url: SecretString,
    /// CSPR.cloud API credentials and Casper node connection settings.
    pub casper: Casper,
    /// Registry of tracked smart contract package hashes.
    pub contracts: ContractRegistry,
    /// Delay between REST API requests in milliseconds (rate limiting).
    pub backfill_rate_limit_ms: u64,
    /// Initial WebSocket reconnect delay in milliseconds.
    pub wss_reconnect_delay_ms: u64,
}

/// CSPR.cloud API credentials and Casper node connection settings.
#[derive(Debug, Clone)]
pub struct Casper {
    /// `CSPR.cloud` API access token.
    pub api_token: SecretString,
    /// `CSPR.cloud` REST API base URL.
    pub rest_url: String,
    /// `CSPR.cloud` WebSocket streaming URL.
    pub wss_url: String,
    /// Casper node JSON-RPC URL (used for ICO backfill via `info_get_deploy`).
    pub node_url: String,
}

impl IndexerConfig {
    /// Loads and validates configuration from environment variables.
    ///
    /// # Errors
    ///
    /// Returns an error if required environment variables are missing
    /// or have invalid values.
    #[inline]
    pub fn from_env() -> Result<Self, IndexerError> {
        let database_url = env::var("DATABASE_URL")
            .map(SecretString::from)
            .map_err(|_| IndexerError::Config("DATABASE_URL must be set".to_owned()))?;
        let api_token = env::var("CSPR_CLOUD_API_TOKEN")
            .map(SecretString::from)
            .map_err(|_| IndexerError::Config("CSPR_CLOUD_API_TOKEN must be set".to_owned()))?;
        let rest_url = env::var("CSPR_CLOUD_REST_URL")
            .map_err(|_| IndexerError::Config("CSPR_CLOUD_REST_URL must be set".to_owned()))
            .and_then(|url| {
                url.starts_with("https://").then_some(url).ok_or_else(|| {
                    IndexerError::Config("CSPR_CLOUD_REST_URL must start with https://".to_owned())
                })
            })?;
        let wss_url = env::var("CSPR_CLOUD_WSS_URL")
            .map_err(|_| IndexerError::Config("CSPR_CLOUD_WSS_URL must be set".to_owned()))
            .and_then(|url| {
                url.starts_with("wss://").then_some(url).ok_or_else(|| {
                    IndexerError::Config("CSPR_CLOUD_WSS_URL must start with wss://".to_owned())
                })
            })?;
        let node_url = env::var("CASPER_NODE_URL")
            .map_err(|_| IndexerError::Config("CASPER_NODE_URL must be set".to_owned()))
            .and_then(|url| {
                (url.starts_with("http://") || url.starts_with("https://"))
                    .then_some(url)
                    .ok_or_else(|| {
                        IndexerError::Config(
                            "CASPER_NODE_URL must start with http:// or https://".to_owned(),
                        )
                    })
            })?;
        let contracts = ContractRegistry::from_env();
        if contracts.active_contracts().is_empty() {
            tracing::warn!(
                "No contract package hashes configured — indexer will have nothing to track"
            );
        }
        let backfill_rate_limit_ms = env::var("BACKFILL_RATE_LIMIT_MS")
            .unwrap_or_else(|_| DEFAULT_BACKFILL_RATE_LIMIT_MS.to_string())
            .parse::<u64>()
            .map_err(|_| {
                IndexerError::Config("BACKFILL_RATE_LIMIT_MS must be a valid number".to_owned())
            })?;
        let wss_reconnect_delay_ms = env::var("WSS_RECONNECT_DELAY_MS")
            .unwrap_or_else(|_| DEFAULT_WSS_RECONNECT_DELAY_MS.to_string())
            .parse::<u64>()
            .map_err(|_| {
                IndexerError::Config("WSS_RECONNECT_DELAY_MS must be a valid number".to_owned())
            })?;

        Ok(Self {
            database_url,
            casper: Casper {
                api_token,
                rest_url,
                wss_url,
                node_url,
            },
            contracts,
            backfill_rate_limit_ms,
            wss_reconnect_delay_ms,
        })
    }
}

/// Known smart contract types deployed on Casper Network.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ContractType {
    /// USDC stablecoin token.
    Usdc,
    /// USDT stablecoin token.
    Usdt,
    /// BIG platform token.
    Big,
    /// Treasury contract for reward distribution.
    Treasury,
    /// ICO contract for token sales.
    Ico,
    /// Lease agreement contract.
    Lease,
    /// Escrow contract for invoice payments.
    Escrow,
    /// NFT contract for property tokenization.
    Nft,
    /// Roles contract for access control.
    Roles,
    /// Staking contract.
    Staking,
    /// Unknown contract.
    Unknown,
}

impl ContractType {
    /// Returns `true` for CEP-18 fungible token contracts (BIG, tUSDC, tUSDT).
    #[inline]
    #[must_use]
    pub fn is_cep18_token(self) -> bool {
        matches!(self, Self::Usdc | Self::Usdt | Self::Big)
    }
}

impl core::fmt::Display for ContractType {
    #[inline]
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.write_str(match self {
            Self::Usdc => "usdc",
            Self::Usdt => "usdt",
            Self::Big => "big",
            Self::Treasury => "treasury",
            Self::Ico => "ico",
            Self::Lease => "lease",
            Self::Escrow => "escrow",
            Self::Nft => "nft",
            Self::Roles => "roles",
            Self::Staking => "staking",
            Self::Unknown => "unknown",
        })
    }
}

/// Registry of tracked smart contract package hashes.
///
/// Each field is optional because not all contracts may be deployed yet.
/// Only contracts with a configured package hash will be indexed.
#[derive(Debug, Clone, Default)]
pub struct ContractRegistry {
    /// USDC contract package hash.
    pub usdc: Option<String>,
    /// USDT contract package hash.
    pub usdt: Option<String>,
    /// BIG contract package hash.
    pub big: Option<String>,
    /// Treasury contract package hash.
    pub treasury: Option<String>,
    /// ICO contract package hash.
    pub ico: Option<String>,
    /// Lease contract package hash.
    pub lease: Option<String>,
    /// Escrow contract package hash.
    pub escrow: Option<String>,
    /// NFT contract package hash.
    pub nft: Option<String>,
    /// Roles contract package hash.
    pub roles: Option<String>,
    /// Staking contract package hash.
    pub staking: Option<String>,
}

impl ContractRegistry {
    /// Loads contract package hashes from environment variables.
    ///
    /// Missing variables are treated as undeployed contracts (set to `None`).
    #[inline]
    #[must_use]
    pub fn from_env() -> Self {
        Self {
            usdc: env::var("CONTRACT_USDC").ok(),
            usdt: env::var("CONTRACT_USDT").ok(),
            big: env::var("CONTRACT_BIG").ok(),
            treasury: env::var("CONTRACT_TREASURY").ok(),
            ico: env::var("CONTRACT_ICO").ok(),
            lease: env::var("CONTRACT_LEASE").ok(),
            escrow: env::var("CONTRACT_ESCROW").ok(),
            nft: env::var("CONTRACT_NFT").ok(),
            roles: env::var("CONTRACT_ROLES").ok(),
            staking: env::var("CONTRACT_STAKING").ok(),
        }
    }

    /// Returns a list of all configured (deployed) contracts with their types.
    ///
    /// The `start_block` for each contract is loaded from environment variables:
    /// - `START_BLOCK_CONTRACT_{TYPE}` (e.g. `START_BLOCK_CONTRACT_ICO=1234`)
    /// - Defaults to `0` (genesis) if not set
    #[inline]
    #[must_use]
    pub fn active_contracts(&self) -> Vec<ActiveContract<'_>> {
        let pairs: [(ContractType, &Option<String>); 10] = [
            (ContractType::Usdc, &self.usdc),
            (ContractType::Usdt, &self.usdt),
            (ContractType::Big, &self.big),
            (ContractType::Treasury, &self.treasury),
            (ContractType::Ico, &self.ico),
            (ContractType::Lease, &self.lease),
            (ContractType::Escrow, &self.escrow),
            (ContractType::Nft, &self.nft),
            (ContractType::Roles, &self.roles),
            (ContractType::Staking, &self.staking),
        ];

        pairs
            .into_iter()
            .filter_map(|(contract_type, hash)| {
                hash.as_deref().map(|h| {
                    // Load start_block from env (e.g. START_BLOCK_CONTRACT_ICO)
                    let env_key = format!(
                        "START_BLOCK_CONTRACT_{}",
                        contract_type.to_string().to_uppercase()
                    );
                    let start_block = env::var(&env_key)
                        .ok()
                        .and_then(|s| s.parse::<u64>().ok())
                        .unwrap_or(0);

                    ActiveContract::new(contract_type, h, start_block)
                })
            })
            .collect()
    }
}

/// A deployed contract with its type and package hash.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ActiveContract<'a> {
    /// The logical type of this contract.
    pub contract_type: ContractType,
    /// The on-chain package hash (hex, no `hash-` prefix).
    pub hash: &'a str,
    /// Block height from which to start indexing (0 = from genesis).
    pub start_block: u64,
}

impl<'a> ActiveContract<'a> {
    /// Creates a new active contract configuration.
    #[inline]
    #[must_use]
    pub fn new(contract_type: ContractType, hash: &'a str, start_block: u64) -> Self {
        Self {
            contract_type,
            hash,
            start_block,
        }
    }
}
