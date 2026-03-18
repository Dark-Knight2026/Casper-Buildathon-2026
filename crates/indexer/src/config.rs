//! Indexer configuration loaded from environment variables via the `config` crate.

use std::collections::HashSet;

use config::{Config, Environment};
use secrecy::SecretString;
use serde::Deserialize;

use crate::error::IndexerError;

/// Default delay between REST API requests in milliseconds.
const DEFAULT_BACKFILL_RATE_LIMIT_MS: u64 = 200;
/// Default initial WebSocket reconnect delay in milliseconds.
const DEFAULT_WSS_RECONNECT_DELAY_MS: u64 = 1000;

/// Flat intermediate struct that mirrors environment variable names exactly.
///
/// Field names match the lowercase form of the env vars so that
/// `config::Environment` can deserialize them without remapping.
#[derive(Debug, Deserialize)]
struct RawEnvConfig {
    database_url: SecretString,
    cspr_cloud_api_token: SecretString,
    cspr_cloud_rest_url: String,
    cspr_cloud_wss_url: String,
    casper_node_rpc_url: String,
    #[serde(default = "default_backfill_rate_limit_ms")]
    backfill_rate_limit_ms: u64,
    #[serde(default = "default_wss_reconnect_delay_ms")]
    wss_reconnect_delay_ms: u64,
}

const fn default_backfill_rate_limit_ms() -> u64 {
    DEFAULT_BACKFILL_RATE_LIMIT_MS
}
const fn default_wss_reconnect_delay_ms() -> u64 {
    DEFAULT_WSS_RECONNECT_DELAY_MS
}

/// Build a [`Config`] from process environment variables.
fn build_config() -> Result<Config, IndexerError> {
    Config::builder()
        .add_source(Environment::default().try_parsing(true).ignore_empty(true))
        .build()
        .map_err(|e| IndexerError::Config(e.to_string()))
}

/// Indexer configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct IndexerConfig {
    /// `PostgreSQL` database connection URL.
    pub database_url: SecretString,
    /// CSPR.cloud API credentials.
    pub casper: Casper,
    /// Registry of tracked smart contract package hashes.
    pub contracts: ContractRegistry,
    /// Delay between REST API requests in milliseconds (rate limiting).
    pub backfill_rate_limit_ms: u64,
    /// Initial WebSocket reconnect delay in milliseconds.
    pub wss_reconnect_delay_ms: u64,
}

/// CSPR.cloud API credentials and Casper node RPC URL.
#[derive(Debug, Clone)]
pub struct Casper {
    /// `CSPR.cloud` API access token.
    pub api_token: SecretString,
    /// `CSPR.cloud` REST API base URL.
    pub rest_url: String,
    /// `CSPR.cloud` WebSocket streaming URL.
    pub wss_url: String,
    /// Casper node JSON-RPC URL. Used for CES backfill.
    pub node_rpc_url: String,
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
        let settings = build_config()?;
        let contracts = ContractRegistry::from_config(&settings);

        let raw: RawEnvConfig = settings
            .try_deserialize()
            .map_err(|e| IndexerError::Config(e.to_string()))?;

        let config = Self {
            database_url: raw.database_url,
            casper: Casper {
                api_token: raw.cspr_cloud_api_token,
                rest_url: raw.cspr_cloud_rest_url,
                wss_url: raw.cspr_cloud_wss_url,
                node_rpc_url: raw.casper_node_rpc_url,
            },
            contracts,
            backfill_rate_limit_ms: raw.backfill_rate_limit_ms,
            wss_reconnect_delay_ms: raw.wss_reconnect_delay_ms,
        };

        config.validate()?;

        if config.contracts.active_contracts().is_empty() {
            tracing::warn!(
                "No contract package hashes configured - indexer will have nothing to track"
            );
        }

        Ok(config)
    }

    /// Validates business rules that serde cannot express.
    fn validate(&self) -> Result<(), IndexerError> {
        if !self.casper.rest_url.starts_with("https://") {
            return Err(IndexerError::Config(
                "CSPR_CLOUD_REST_URL must start with https://".to_owned(),
            ));
        }
        if !self.casper.wss_url.starts_with("wss://") {
            return Err(IndexerError::Config(
                "CSPR_CLOUD_WSS_URL must start with wss://".to_owned(),
            ));
        }
        if !self.casper.node_rpc_url.starts_with("https://") {
            return Err(IndexerError::Config(
                "CASPER_NODE_RPC_URL must start with https://".to_owned(),
            ));
        }
        Ok(())
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
    /// Vesting contract for token lock-up schedules.
    Vesting,
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

    /// Returns the currency symbol for CEP-18 token contracts, `None` for others.
    #[inline]
    #[must_use]
    pub fn currency_symbol(self) -> Option<&'static str> {
        match self {
            Self::Big => Some("BIG"),
            Self::Usdc => Some("USDC"),
            Self::Usdt => Some("USDT"),
            _ => None,
        }
    }

    /// Returns the lowercase string label for this contract type.
    #[inline]
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
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
            Self::Vesting => "vesting",
            Self::Unknown => "unknown",
        }
    }
}

/// Configuration entry for a single contract in the registry.
#[derive(Debug, Clone)]
pub struct ContractEntry {
    /// On-chain package hash (hex, no `hash-` prefix).
    pub hash: String,
    /// Block height from which to start indexing (0 = from genesis).
    pub start_block: u64,
}

impl ContractEntry {
    /// Creates a new contract entry.
    #[inline]
    #[must_use]
    pub fn new(hash: impl Into<String>, start_block: u64) -> Self {
        Self {
            hash: hash.into(),
            start_block,
        }
    }
}

/// Registry of tracked smart contract package hashes and their start blocks.
///
/// Each field is optional because not all contracts may be deployed yet.
/// Only contracts with a configured package hash will be indexed.
///
/// Both the hash and the start block are read once in [`ContractRegistry::from_env`]
/// so that [`ContractRegistry::active_contracts`] does not re-read environment
/// variables on every call.
#[derive(Debug, Clone, Default)]
pub struct ContractRegistry {
    /// USDC contract entry.
    pub usdc: Option<ContractEntry>,
    /// USDT contract entry.
    pub usdt: Option<ContractEntry>,
    /// BIG contract entry.
    pub big: Option<ContractEntry>,
    /// Treasury contract entry.
    pub treasury: Option<ContractEntry>,
    /// ICO contract entry.
    pub ico: Option<ContractEntry>,
    /// Lease contract entry.
    pub lease: Option<ContractEntry>,
    /// Escrow contract entry.
    pub escrow: Option<ContractEntry>,
    /// NFT contract entry.
    pub nft: Option<ContractEntry>,
    /// Roles contract entry.
    pub roles: Option<ContractEntry>,
    /// Staking contract entry.
    pub staking: Option<ContractEntry>,
    /// Vesting contract entry.
    pub vesting: Option<ContractEntry>,
}

impl ContractRegistry {
    /// Loads contract package hashes and start blocks from environment variables.
    ///
    /// Missing or empty `CONTRACT_*` variables are treated as undeployed contracts
    /// (set to `None`). Missing `START_BLOCK_CONTRACT_*` variables default to `0`.
    #[inline]
    #[must_use]
    pub fn from_env() -> Self {
        // Build a fresh Config so this method stays usable standalone (e.g. in tests).
        let settings = build_config().unwrap_or_default();
        Self::from_config(&settings)
    }

    /// Build registry from an already-loaded [`Config`].
    fn from_config(settings: &Config) -> Self {
        Self {
            usdc: Self::read_contract(settings, "usdc"),
            usdt: Self::read_contract(settings, "usdt"),
            big: Self::read_contract(settings, "big"),
            treasury: Self::read_contract(settings, "treasury"),
            ico: Self::read_contract(settings, "ico"),
            lease: Self::read_contract(settings, "lease"),
            escrow: Self::read_contract(settings, "escrow"),
            nft: Self::read_contract(settings, "nft"),
            roles: Self::read_contract(settings, "roles"),
            staking: Self::read_contract(settings, "staking"),
            vesting: Self::read_contract(settings, "vesting"),
        }
    }

    /// Read a [`ContractEntry`] from a [`Config`] instance.
    ///
    /// Returns `None` if the hash key is missing or empty.
    fn read_contract(settings: &Config, name: &str) -> Option<ContractEntry> {
        let hash = settings
            .get_string(&format!("contract_{name}"))
            .ok()
            .filter(|s| !s.is_empty())?;
        let start_block = settings
            .get_int(&format!("start_block_contract_{name}"))
            .ok()
            .and_then(|v| u64::try_from(v).ok())
            .unwrap_or(0);
        Some(ContractEntry { hash, start_block })
    }

    /// Returns a set of all active contract package hashes for `O(1)` lookup.
    ///
    /// Used by event handlers to determine whether an address is a known
    /// contract (`HashType::Contract`) or a regular account (`HashType::Account`).
    #[inline]
    #[must_use]
    pub fn contract_hash_set(&self) -> HashSet<String> {
        self.active_contracts()
            .into_iter()
            .map(|c| c.hash.to_owned())
            .collect()
    }

    /// Returns a list of all configured (deployed) contracts with their types.
    #[inline]
    #[must_use]
    pub fn active_contracts(&self) -> Vec<ActiveContract<'_>> {
        let pairs: [(ContractType, &Option<ContractEntry>); 11] = [
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
            (ContractType::Vesting, &self.vesting),
        ];

        pairs
            .into_iter()
            .filter_map(|(contract_type, entry)| {
                entry
                    .as_ref()
                    .map(|e| ActiveContract::new(contract_type, &e.hash, e.start_block))
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
