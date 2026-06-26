CREATE TABLE invoices (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    onchain_invoice_id   NUMERIC           NULL,
    lease_id             UUID          NOT NULL REFERENCES leases(id)      ON DELETE RESTRICT,
    kind                 TEXT          NOT NULL CHECK (kind IN ('rent', 'security_deposit')),
    tenant_id            UUID          NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
    landlord_id          UUID          NOT NULL REFERENCES users(id)       ON DELETE RESTRICT,
    property_id          UUID          NOT NULL REFERENCES properties(id)  ON DELETE RESTRICT,
    amount_due           DECIMAL(20,6) NOT NULL CHECK (amount_due >= 0),
    rent_paid            DECIMAL(20,6) NOT NULL DEFAULT 0 CHECK (rent_paid >= 0),
    property_manager_id  UUID              NULL REFERENCES users(id),
    property_manager_bps INT           NOT NULL DEFAULT 0 CHECK (property_manager_bps BETWEEN 0 AND 10000),
    status               TEXT          NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','pending','partial','paid','released','refunded','cancelled')),
    deadline             DATE          NOT NULL,
    landlord_charge      DECIMAL(20,6)     NULL,
    tenant_refund        DECIMAL(20,6)     NULL,
    tx_hash              TEXT              NULL,
    receipt_url          TEXT              NULL,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_lease_id     ON invoices(lease_id);
CREATE INDEX idx_invoices_tenant_id    ON invoices(tenant_id);
CREATE INDEX idx_invoices_landlord_id  ON invoices(landlord_id);
CREATE INDEX idx_invoices_status       ON invoices(status);
CREATE INDEX idx_invoices_deadline     ON invoices(deadline);

CREATE INDEX idx_invoices_onchain_id   ON invoices(onchain_invoice_id)
    WHERE onchain_invoice_id IS NOT NULL;

-- fast lookup for the InvoiceCreated indexer handler
CREATE INDEX idx_invoices_scheduled_matching ON invoices(lease_id, kind, deadline)
    WHERE status = 'scheduled';

-- fast overdue queries
CREATE INDEX idx_invoices_overdue ON invoices(status, deadline)
    WHERE status IN ('pending', 'partial');

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view their invoices"
    ON invoices FOR SELECT
    USING (
        tenant_id   = auth.uid()
        OR landlord_id = auth.uid()
    );
