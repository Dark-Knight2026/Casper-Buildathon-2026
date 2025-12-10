use odra::prelude::*;

// use crate::roles::RolesContractRef;

#[odra::module]
pub struct Escrow {
    // roles: External<RolesContractRef>,
}

#[odra::module]
impl Escrow {
    pub fn init(&mut self) {}
}

pub mod events {}

pub mod errors {}
