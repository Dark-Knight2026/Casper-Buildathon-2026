# Documentation & Responsibility Matrix

## 🏛️ Module Responsibilities

| Directory | Responsibility | Technology |
|-----------|----------------|------------|
| `src/` | Core API Logic, Tax Calculations, Analytics Aggregation | Rust (Axum) |
| `supabase/migrations/` | Database Schema, RLS Policies, Indexes | PostgreSQL |
| `supabase/functions/` | Lightweight Tasks (Email, Stripe Webhooks, Notifications) | TypeScript (Deno) |
| `docs/` | Architecture Designs, Specs, Drafts | Markdown |

## 📚 Key Documents

- **[spec.md](../SPEC.md)** - Functional Requirements & API Contract.
- **[casper_integration_prd.md](./casper_integration_prd.md)** - Blockchain Integration specifics.
- **[database_schema_design.md](./design/database_schema_design.md)** - DB Architecture details.