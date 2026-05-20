use odra::{
    casper_types::{U256, U512},
    prelude::*,
    uints::ToU512,
    ContractRef,
};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::{
    common::CurrencyAmount,
    escrow::{
        errors::Error,
        events::{InvoiceCreated, InvoicePaid, MinDeadlineSet},
        types::{Invoice, InvoiceKind},
    },
};

// =============================================================================
// Escrow Types
// =============================================================================

pub mod types {
    use odra::{casper_types::U256, prelude::*};

    use crate::common::CurrencyAmount;

    #[odra::odra_type]
    pub enum InvoiceKind {
        SecurityDeposit,
        Lease,
    }

    #[odra::odra_type]
    pub struct Invoice {
        /// Invoice category.
        pub kind: InvoiceKind,
        /// Wallet required to pay the invoice.
        pub buyer: Address,
        /// Primary recipient of the invoice.
        /// @dev For lease invoices, this is the landlord. For security deposits, this is the lease contract.
        pub seller: Address,
        /// Total amount due for this invoice.
        /// @dev For lease invoices, this equals base rent plus equity amount.
        pub amount_due: CurrencyAmount,
        /// Required base rent amount for lease invoices.
        /// @dev Zero for security deposit invoices.
        pub rent_amount: U256,
        /// Required lease-to-own amount for lease invoices.
        /// @dev Zero for security deposit invoices.
        pub equity_amount: U256,
        /// Base rent amount already paid.
        /// @dev This will be used by partial payment logic.
        pub rent_paid: U256,
        /// Equity amount already paid.
        /// @dev This will be used by partial payment logic.
        pub equity_paid: U256,
        /// Optional property manager that receives a percentage of base rent.
        pub property_manager: Option<Address>,
        /// Property manager rent share in basis points.
        // TODO: I need to figure out exactly why I can't use u16 here but we can use u16 for constants.
        pub property_manager_bps: u32,
        /// Timestamp after which the invoice can no longer be paid.
        pub deadline: u64,
        /// Whether the invoice has been fully paid.
        pub is_paid: bool,
    }

    #[odra::odra_type]
    pub struct CreateLeaseInvoiceParams {
        pub tenant: Address,
        pub landlord: Address,
        pub rent: CurrencyAmount,
        pub equity_amount: U256,
        pub property_manager: Option<Address>,
        pub property_manager_bps: u32,
        pub deadline: u64,
    }
}

// =============================================================================
// Events
// =============================================================================

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
        pub created_at: u64,
    }

    #[odra::event]
    pub struct InvoicePaid {
        pub invoice_id: U256,
        pub paid_at: u64,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        CallerNotLeaseContract = 300,
        LeaseContractIsNotSet = 301,
        TreasuryContractIsNotSet = 302,
        ZeroAmount = 303,
        InvalidDeadline = 304,
        InvalidInvoiceId = 305,
        CallerIsNotBuyer = 306,
        InvoiceIsAlreadyPaid = 307,
        InvoiceIsExpired = 308,
        InvalidAmountAttached = 309,
        EqualBuyerAndSeller = 310,
    }
}

// =============================================================================
// Contract
// =============================================================================


#[odra::module(errors = Error, events = [MinDeadlineSet, InvoiceCreated, InvoicePaid])]
pub struct Escrow {
    ownable: SubModule<Ownable>,
    lease: Var<Address>,
    treasury: Var<Address>,
    invoices: Mapping<U256, Invoice>,
    invoices_count: Var<U256>,
    min_deadline: Var<u64>,
}

#[odra::module]
impl Escrow {

   // =========================================================================
   // Initialization
   // =========================================================================

    pub fn init(&mut self, owner: Address, min_deadline: u64) {
        self.ownable.init(owner);
        self.set_min_deadline(min_deadline);
    }

    /// Sets the minimum possible invoice deadline by the owner
    pub fn set_min_deadline(&mut self, new_min_deadline: u64) {
        self.assert_owner();

        let old_min_deadline = self.min_deadline.get_or_default();

        self.min_deadline.set(new_min_deadline);

        self.env().emit_event(MinDeadlineSet {
            old_min_deadline,
            new_min_deadline,
        });
    }

    // =========================================================================
    // Owner-only configuration
    // =========================================================================

    /// Sets the Lease contract address by the owner
    pub fn set_lease(&mut self, lease: Address) {
        self.assert_owner();
        self.lease.set(lease);
    }

    /// Sets the Treasury contract address by the owner
    pub fn set_treasury(&mut self, treasury: Address) {
        self.assert_owner();
        self.treasury.set(treasury);
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    /// Returns the Lease contract address
    pub fn get_lease_contract_address(&self) -> Address {
        self.lease.get_or_revert_with(Error::LeaseContractIsNotSet)
    }

    /// Returns the Treasury contract address
    pub fn get_treasury_contract_address(&self) -> Address {
        self.treasury
            .get_or_revert_with(Error::TreasuryContractIsNotSet)
    }

    /// Returns invoice by its ID
    pub fn get_invoice_by_id(&self, invoice_id: U256) -> Invoice {
        self.invoices
            .get(&invoice_id)
            .unwrap_or_revert_with(&self.env(), Error::InvalidInvoiceId)
    }

    /// Returns number of invoices created through this contract
    pub fn get_invoices_count(&self) -> U256 {
        self.invoices_count.get_or_default()
    }

    /// Returns the minimum invoice deadline
    pub fn get_min_deadline(&self) -> u64 {
        self.min_deadline.get_or_default()
    }

    // =========================================================================
    // Invoice Management
    // =========================================================================

    /// Allows to create a lease invoice by the Lease contract
    #[odra(non_reentrant)]
    pub fn create_lease_invoice(
        &mut self,
        tenant: Address,
        landlord: Address,
        amount_due: CurrencyAmount,
        deadline: u64,
    ) -> U256 {
        self.assert_lease();
        self.create_invoice(InvoiceKind::Lease, tenant, landlord, amount_due, deadline)
    }

    /// Allows to create a security deposit invoice by the Lease contract
    #[odra(non_reentrant)]
    pub fn create_security_deposit_invoice(
        &mut self,
        tenant: Address,
        amount_due: CurrencyAmount,
        deadline: u64,
    ) -> U256 {
        self.assert_lease();
        self.create_invoice(
            InvoiceKind::SecurityDeposit,
            tenant,
            self.get_lease_contract_address(),
            amount_due,
            deadline,
        )
    }

    /// Allows to pay any invoice created earlier
    #[odra(payable)]
    #[odra(non_reentrant)]
    pub fn pay_invoice(&mut self, invoice_id: U256) {
        let mut invoice = self
            .invoices
            .get(&invoice_id)
            .unwrap_or_revert_with(&self.env(), Error::InvalidInvoiceId);

        if self.env().caller() != invoice.buyer {
            self.env().revert(Error::CallerIsNotBuyer);
        }

        if invoice.is_paid {
            self.env().revert(Error::InvoiceIsAlreadyPaid);
        }

        if self.env().get_block_time() > invoice.deadline {
            self.env().revert(Error::InvoiceIsExpired);
        }

        let attached_value = self.env().attached_value();
        let recipient = invoice.seller;

        // TODO charge 2% fee for every payment, and accumulate unless TailorCoin (BIG) token pool is deployed

        if invoice.amount_due.currency().is_none() {
            if attached_value != invoice.amount_due.amount().to_u512() {
                self.env().revert(Error::InvalidAmountAttached);
            }

            self.env().transfer_tokens(&recipient, &attached_value);
        } else {
            if attached_value > U512::zero() {
                self.env().revert(Error::InvalidAmountAttached);
            }

            Cep18ContractRef::new(self.env(), invoice.amount_due.currency().unwrap())
                .transfer_from(&invoice.buyer, &recipient, invoice.amount_due.amount());
        }

        invoice.is_paid = true;
        self.invoices.set(&invoice_id, invoice);

        self.env().emit_event(InvoicePaid {
            invoice_id,
            paid_at: self.env().get_block_time(),
        });
    }

    // =========================================================================
    // Ownable delegation
    // =========================================================================

    delegate! {
        to self.ownable {
            fn transfer_ownership(&mut self, new_owner: &Address);
            fn renounce_ownership(&mut self);
            fn get_owner(&self) -> Address;
        }
    }
}

impl Escrow {
    fn create_invoice(
        &mut self,
        kind: InvoiceKind,
        buyer: Address,
        seller: Address,
        mut amount_due: CurrencyAmount,
        deadline: u64,
    ) -> U256 {
        if buyer == seller {
            self.env().revert(Error::EqualBuyerAndSeller)
        }

        if *amount_due.amount() == U256::zero() {
            self.env().revert(Error::ZeroAmount);
        }

        if deadline < self.env().get_block_time() + self.min_deadline.get_or_default() {
            self.env().revert(Error::InvalidDeadline);
        }

        let invoice_id = self.get_invoices_count();
        let invoice = Invoice {
            kind,
            buyer,
            seller,
            amount_due,
            rent_amount: ,
            equity_amount: ,
            rent_paid: U256::zero(),
            equity_paid: U256::zero(),
            property_manager: ,
            property_manager_bps: ,
            deadline,
            is_paid: false,
        };

        self.invoices.set(&invoice_id, invoice);
        self.invoices_count.set(invoice_id + 1);

        self.env().emit_event(InvoiceCreated {
            invoice_id,
            created_at: self.env().get_block_time(),
        });

        invoice_id
    }

    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }

    #[inline]
    fn assert_lease(&self) {
        if self.env().caller() != self.get_lease_contract_address() {
            self.env().revert(Error::CallerNotLeaseContract);
        }
    }
}
