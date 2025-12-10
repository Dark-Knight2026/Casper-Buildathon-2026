use odra::{casper_types::U256, prelude::*};
use odra_modules::access::Ownable;

use crate::escrow::{
    errors::Error,
    events::{InvoiceCreated, MinDeadlineSet},
};
use crate::roles::RolesContractRef;

#[odra::odra_type]
pub enum InvoiceKind {
    LEASE,
    BUY,
    SELL,
}

#[odra::odra_type]
pub struct Invoice {
    kind: InvoiceKind,
    buyer: Address,
    seller: Address,
    currency: Option<Address>,
    amount: U256,
    deadline: u64,
    is_confirmed: bool,
}

#[odra::module(errors = Error, events = [MinDeadlineSet, InvoiceCreated])]
pub struct Escrow {
    ownable: SubModule<Ownable>,
    roles: External<RolesContractRef>,
    invoices: Mapping<U256, Invoice>,
    invoices_count: Var<U256>,
    min_deadline: Var<u64>,
}

#[odra::module]
impl Escrow {
    pub fn init(&mut self, owner: Address, roles: Address, min_deadline: u64) {
        self.ownable.init(owner);
        self.roles.set(roles);
        self.set_min_deadline(min_deadline);
    }

    pub fn set_min_deadline(&mut self, new_min_deadline: u64) {
        self.ownable.assert_owner(&self.env().caller());

        let old_min_deadline = self.min_deadline.get_or_default();

        self.min_deadline.set(new_min_deadline);

        self.env().emit_native_event(MinDeadlineSet {
            old_min_deadline,
            new_min_deadline,
        });
    }

    pub fn create_lease_invoice(
        &mut self,
        tenant: Address,
        currency: Option<Address>,
        amount: U256,
        deadline: u64,
    ) -> U256 {
        self.assert_landlord(self.env().caller());
        self.create_invoice(InvoiceKind::LEASE, tenant, currency, amount, deadline)
    }
}

impl Escrow {
    fn create_invoice(
        &mut self,
        kind: InvoiceKind,
        buyer: Address,
        currency: Option<Address>,
        amount: U256,
        deadline: u64,
    ) -> U256 {
        if amount == U256::zero() {
            self.env().revert(Error::ZeroAmount);
        }

        if deadline <= self.env().get_block_time() + self.min_deadline.get_or_default() {
            self.env().revert(Error::InvalidDeadline);
        }

        let seller = self.env().caller();
        let invoice_id = self.invoices_count.get_or_default();
        let invoice = Invoice {
            kind,
            buyer,
            seller,
            currency,
            amount,
            deadline,
            is_confirmed: false,
        };

        self.invoices.set(&invoice_id, invoice);
        self.invoices_count.set(invoice_id + 1);

        self.env().emit_native_event(InvoiceCreated {
            invoice_id,
            buyer,
            seller,
        });

        invoice_id
    }

    fn assert_landlord(&self, caller: Address) {
        let landlord_role: [u8; 32] = self.roles.get_landlord_role();

        if !self.roles.has_role(&landlord_role, &caller) {
            self.env().revert(Error::CallerNotALandlord);
        }
    }
}

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct MinDeadlineSet {
        pub old_min_deadline: u64,
        pub new_min_deadline: u64,
    }

    #[odra::event]
    pub struct InvoiceCreated {
        pub invoice_id: U256,
        pub buyer: Address,
        pub seller: Address,
    }
}

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        CallerNotALandlord = 65_000,
        ZeroAmount = 65_001,
        InvalidDeadline = 65_002,
    }
}
