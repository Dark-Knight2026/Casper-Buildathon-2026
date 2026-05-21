use odra::{
    casper_types::{U256, U512},
    prelude::*,
    uints::ToU512,
    ContractRef,
};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::{
    common::CurrencyAmount,
    constants::{LEASEFI_TRANSACTION_FEE_BPS, ONE_HUNDRED_PERCENT_BPS},
    escrow::{
        errors::Error,
        events::{InvoiceCreated, InvoicePaid, InvoicePaymentApplied, MinDeadlineSet},
        types::{CreateLeaseInvoiceParams, Invoice, InvoiceKind},
    },
};

// =============================================================================
// Escrow Types
// =============================================================================

pub mod types {
    use odra::{casper_types::U256, prelude::*};

    use crate::common::CurrencyAmount;

    #[odra::odra_type]
    #[derive(Copy)]
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

    #[odra::event]
    pub struct InvoicePaymentApplied {
        pub invoice_id: U256,
        pub payer: Address,
        pub amount: U256,
        pub protocol_fee: U256,
        pub rent_paid: U256,
        pub equity_paid: U256,
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
        InvalidPaymentAmount = 311,
        PaymentExceedsAmountDue = 312,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [
  MinDeadlineSet, InvoiceCreated, InvoicePaid, InvoicePaymentApplied
])]
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

    /// Allows the Lease contract to create a monthly lease invoice.
    /// @dev Lease invoices track base rent and optional equity separately so payment
    ///            distribution can always satisfy rent before equity.
    #[odra(non_reentrant)]
    pub fn create_lease_invoice(&mut self, params: CreateLeaseInvoiceParams) -> U256 {
        self.assert_lease();

        let mut rent = params.rent;
        let rent_amount = *rent.amount();

        if rent_amount.is_zero() {
            self.env().revert(Error::ZeroAmount);
        }

        let amount_due = CurrencyAmount::new(*rent.currency(), rent_amount + params.equity_amount);

        self.create_invoice(Invoice {
            kind: InvoiceKind::Lease,
            buyer: params.tenant,
            seller: params.landlord,
            amount_due,
            rent_amount,
            equity_amount: params.equity_amount,
            rent_paid: U256::zero(),
            equity_paid: U256::zero(),
            property_manager: params.property_manager,
            property_manager_bps: params.property_manager_bps,
            deadline: params.deadline,
            is_paid: false,
        })
    }

    /// Allows to create a security deposit invoice by the Lease contract
    // TODO: Per client call, we need to actually store the security deposit in the escrow contract. The currency for the security deposit should ONLY be USDC.
    #[odra(non_reentrant)]
    pub fn create_security_deposit_invoice(
        &mut self,
        tenant: Address,
        amount_due: CurrencyAmount,
        deadline: u64,
    ) -> U256 {
        self.assert_lease();

        self.create_invoice(Invoice {
            kind: InvoiceKind::SecurityDeposit,
            buyer: tenant,
            seller: self.get_lease_contract_address(),
            amount_due,
            rent_amount: U256::zero(),
            equity_amount: U256::zero(),
            rent_paid: U256::zero(),
            equity_paid: U256::zero(),
            property_manager: None,
            property_manager_bps: 0,
            deadline,
            is_paid: false,
        })
    }

    /// Allows to pay any invoice created earlier
    // TODO: Does the security deposit get paid with the pay_invoice function?
    #[odra(payable)]
    #[odra(non_reentrant)]
    pub fn pay_invoice(&mut self, invoice_id: U256, amount: U256) {
        let mut invoice = self
            .invoices
            .get(&invoice_id)
            .unwrap_or_revert_with(&self.env(), Error::InvalidInvoiceId);

        self.assert_invoice_payable(&invoice, amount);

        match invoice.kind {
            InvoiceKind::SecurityDeposit => {
                self.pay_security_deposit_invoice(&mut invoice, amount);
            }
            InvoiceKind::Lease => {
                self.pay_lease_invoice(invoice_id, &mut invoice, amount);
            }
        }

        self.invoices.set(&invoice_id, invoice);
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

// =============================================================================
// Internal Helpers
// =============================================================================

impl Escrow {
    fn create_invoice(&mut self, mut invoice: Invoice) -> U256 {
        if invoice.buyer == invoice.seller {
            self.env().revert(Error::EqualBuyerAndSeller)
        }

        if *invoice.amount_due.amount() == U256::zero() {
            self.env().revert(Error::ZeroAmount);
        }

        if invoice.deadline < self.env().get_block_time() + self.min_deadline.get_or_default() {
            self.env().revert(Error::InvalidDeadline);
        }

        let invoice_id = self.get_invoices_count();

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

    #[inline]
    fn assert_invoice_payable(&self, invoice: &Invoice, amount: U256) {
        if self.env().caller() != invoice.buyer {
            self.env().revert(Error::CallerIsNotBuyer);
        }

        if invoice.is_paid {
            self.env().revert(Error::InvoiceIsAlreadyPaid);
        }

        if self.env().get_block_time() > invoice.deadline {
            self.env().revert(Error::InvoiceIsExpired);
        }

        if amount.is_zero() {
            self.env().revert(Error::ZeroAmount);
        }

        self.assert_valid_payment_value(invoice, amount);
    }

    fn pay_security_deposit_invoice(&mut self, invoice: &mut Invoice, amount: U256) {
        if amount != *invoice.amount_due.amount() {
            self.env().revert(Error::InvalidPaymentAmount);
        }

        self.transfer_payment(
            *invoice.amount_due.currency(),
            invoice.buyer,
            invoice.seller,
            amount,
        );

        invoice.is_paid = true;
    }

    fn pay_lease_invoice(&mut self, invoice_id: U256, invoice: &mut Invoice, amount: U256) {
        let protocol_fee = self.calculate_bps_amount(amount, LEASEFI_TRANSACTION_FEE_BPS);
        let distributable_amount = amount - protocol_fee;

        let rent_allocation = Self::min(distributable_amount, self.remaining_rent(invoice));
        let remaining_after_rent = distributable_amount - rent_allocation;
        let equity_allocation = Self::min(remaining_after_rent, self.remaining_equity(invoice));

        if remaining_after_rent > equity_allocation {
            self.env().revert(Error::PaymentExceedsAmountDue);
        }

        let currency = *invoice.amount_due.currency();

        self.transfer_payment(
            currency,
            invoice.buyer,
            self.get_treasury_contract_address(),
            protocol_fee,
        );

        invoice.rent_paid += rent_allocation;
        invoice.equity_paid += equity_allocation;
        invoice.is_paid =
            self.remaining_rent(invoice).is_zero() && self.remaining_equity(invoice).is_zero();

        self.env().emit_event(InvoicePaymentApplied {
            invoice_id,
            payer: invoice.buyer,
            amount,
            protocol_fee,
            rent_paid: invoice.rent_paid,
            equity_paid: invoice.equity_paid,
        });

        if invoice.is_paid {
            self.env().emit_event(InvoicePaid {
                invoice_id,
                paid_at: self.env().get_block_time(),
            });
        }
    }

    fn distribute_rent(&mut self, invoice: &Invoice, currency: Option<Address>, rent_amount: U256) {
        if rent_amount.is_zero() {
            return;
        }

        let property_manager_amount =
            self.calculate_bps_amount(rent_amount, invoice.property_manager_bps);
        let landlord_amount = rent_amount - property_manager_amount;

        if let Some(property_manager) = invoice.property_manager {
            self.transfer_payment(
                currency,
                invoice.buyer,
                property_manager,
                property_manager_amount,
            );
        }

        self.transfer_payment(currency, invoice.buyer, invoice.seller, landlord_amount);
    }

    fn assert_valid_payment_value(&self, invoice: &Invoice, amount: U256) {
        let mut amount_due = invoice.amount_due;
        match amount_due.currency() {
            None => {
                if self.env().attached_value() != amount.to_u512() {
                    self.env().revert(Error::InvalidAmountAttached);
                }
            }
            Some(_) => {
                if self.env().attached_value() != U512::zero() {
                    self.env().revert(Error::InvalidAmountAttached);
                }
            }
        }
    }

    fn transfer_payment(
        &mut self,
        currency: Option<Address>,
        sender: Address,
        recipient: Address,
        amount: U256,
    ) {
        if amount.is_zero() {
            return;
        }

        match currency {
            None => self.env().transfer_tokens(&recipient, &amount.to_u512()),
            Some(token) => {
                Cep18ContractRef::new(self.env(), token)
                    .transfer_from(&sender, &recipient, &amount);
            }
        }
    }

    fn remaining_rent(&self, invoice: &Invoice) -> U256 {
        invoice.rent_amount - invoice.rent_paid
    }

    fn remaining_equity(&self, invoice: &Invoice) -> U256 {
        invoice.equity_amount - invoice.equity_paid
    }

    fn calculate_bps_amount(&self, amount: U256, bps: u32) -> U256 {
        amount * U256::from(bps) / U256::from(ONE_HUNDRED_PERCENT_BPS)
    }

    fn min(left: U256, right: U256) -> U256 {
        if left < right {
            left
        } else {
            right
        }
    }
}
