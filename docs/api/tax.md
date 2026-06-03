# Tax Center API

## POST `/api/v1/tax/calculate-liability`

- **Input:** JSON with `fiscal_year`, `property_ids`
- **Output:** Calculated tax report (Income, Deductions, Estimated Tax)
- **Status:** *Mock Implementation (Phase 1)*
- **Auth:** Access cookie required; email must be verified (`verification_level >= email`). Unverified callers receive `403 verification_required` with body `{ "error": "verification_required", "required_level": "email" }`.
