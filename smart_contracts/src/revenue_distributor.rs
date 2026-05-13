use odra::{
    casper_types::{U256, U512},
    prelude::*,
    uints::ToU512,
    ContractRef,
};
use odra_modules::cep18_token::Cep18ContractRef;

use crate::{
    investor_registry::InvestorRegistryContractRef,
    property_fraction_token::PropertyFractionTokenContractRef,
    property_registry::PropertyRegistryContractRef,
};
