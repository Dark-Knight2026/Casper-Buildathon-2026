# Tax Data Model & Logic Analysis

**Date:** 2025-12-10
**Analyst:** David (Data Analyst)
**Subject:** Review of `src/services/taxService.ts` for Tax Center Feature

## 1. Executive Summary
The current `TaxService` provides a robust mock implementation suitable for frontend development and user flow demonstration. The data models cover the core pillars of real estate taxation: Mortgage Interest (Buyers), Capital Gains (Sellers), Depreciation/Expenses (Landlords), and Rent History (Tenants). However, several critical tax accounting nuances (amortization schedules, depreciation recapture, state taxes) are simplified or missing, which must be addressed before connecting to a real backend or using for actual financial planning.

## 2. Data Model Validation

### 2.1 Core Interfaces
| Interface | Status | Observations |
|-----------|--------|--------------|
| `TaxDocument` | ✅ Valid | Covers essential metadata (type, category, taxYear). |
| `TaxDeduction` | ⚠️ Incomplete | **Critical Missing Field**: `propertyId`. For landlords with multiple properties, deductions must be linked to a specific asset for Schedule E reporting. |
| `TaxSummary` | ✅ Valid | Good high-level snapshot. `filingStatus` should eventually be an enum rather than a string to support logic branching. |
| `RentalIncomeData` | ⚠️ Rigid | The `expenses` object uses fixed keys. Recommend refactoring to an array of expense objects or a dynamic map to support custom user categories. |

### 2.2 Specific Data Structures
*   **CapitalGainsData**: Lacks fields for "Accumulated Depreciation" (needed for Recapture Tax) and "Section 121 Exclusion" (Primary Residence Exclusion).
*   **MortgageInterestData**: Sufficient for display, but `annualInterest` is a derived value that should ideally come from an amortization engine.

## 3. Calculation Logic Review

### 3.1 Mortgage Interest (`calculateMortgageInterest`)
*   **Current Logic**: Approximates annual interest as `Monthly Payment * 12 * 0.7`.
*   **Analysis**: This is a rough heuristic. Interest portions are significantly higher in the early years of a loan.
*   **Recommendation**: Implement a standard amortization function to calculate exact interest based on the specific loan year.

### 3.2 Capital Gains (`calculateCapitalGains`)
*   **Current Logic**: `(Sale Price - Selling Costs) - (Purchase Price + Improvements)`. Tax rate fixed at 15%.
*   **Analysis**:
    *   **Basis Calculation**: Correct.
    *   **Tax Rate**: Oversimplified. Long-term capital gains rates vary (0%, 15%, 20%) based on total taxable income. It also misses the Net Investment Income Tax (3.8%) for high earners.
    *   **Recapture**: Completely missing. Depreciation taken during ownership is taxed at a different rate (max 25%) upon sale.

### 3.3 Depreciation (`calculateDepreciation`)
*   **Current Logic**: `(Property Value - Land Value) / 27.5`.
*   **Analysis**: Correct standard straight-line method for residential rental property.
*   **Nuance**: Does not account for the "Mid-Month Convention" (you only get half a month of depreciation for the month placed in service).

### 3.4 Home Office (`calculateHomeOfficeDeduction`)
*   **Current Logic**: `(Office SqFt / Total SqFt) * Annual Rent`.
*   **Analysis**: Accurate implementation of the "Actual Expenses" method for renters.

## 4. Gap Analysis

1.  **Depreciation Recapture**: The biggest financial gap for Real Estate Investors. Selling a rental property triggers tax on the depreciation previously claimed. The current model treats all gain as Capital Gain (15%), potentially underestimating tax liability.
2.  **State Taxes**: The system currently calculates only Federal estimates. State taxes (e.g., California's 13.3%) can double the tax burden.
3.  **Entity Context**: The logic assumes personal ownership. LLCs, S-Corps, and Partnerships require different reporting structures (Form 1065/K-1) not supported here.
4.  **Date Precision**: Calculations assume full-year scenarios. Prorating for mid-year purchases/sales is needed.

## 5. Recommendations

### Immediate (Frontend/Demo Phase)
1.  **Update `TaxDeduction`**: Add optional `propertyId: string` to the interface to support multi-property assignment in the UI.
2.  **Update `CapitalGainsData`**: Add `accumulatedDepreciation` field to the interface to prepare for future logic.

### Future (Backend/Production Phase)
1.  **Amortization Engine**: Replace the `0.7` approximation in mortgage interest with a true amortization utility.
2.  **Tax Tables**: Move hardcoded tax rates (15%, 27.5 years) into a configuration file or database table to support tax law changes.
3.  **Depreciation Schedule**: Create a persistent "Asset" model that tracks `placedInServiceDate` and `accumulatedDepreciation` over time.