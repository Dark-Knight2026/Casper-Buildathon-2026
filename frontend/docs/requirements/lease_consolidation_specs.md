# Lease Consolidation Specifications

**Date:** December 11, 2024
**Author:** Emma (Product Manager)
**Status:** Draft

## 1. Overview
This document outlines the requirements for consolidating the legacy `EnhancedLeases.tsx` page into the new Kanban-based `LeasePipeline.tsx`. The goal is to retain all advanced features (AI, Compliance, Templates) while leveraging the modern Kanban workflow for better usability.

## 2. Feature Mapping

| Feature | Legacy Location (`EnhancedLeases.tsx`) | New Location (`LeasePipeline.tsx`) | Integration Strategy |
| :--- | :--- | :--- | :--- |
| **Lease Creation** | "Create New Lease" Button -> Wizard Dialog | "New Lease" Button (Top Right) | Reuse existing `LeaseAgreementGenerator` in a Dialog. Add "From Template" option. |
| **AI Clause Suggestions** | "AI Suggestions" Button on Draft Card | Kanban Card Action (Draft Column) | Add "AI Assist" button to `KanbanCard` for Draft leases. Opens `AIClauseSuggestionEngine` modal. |
| **Compliance Checker** | "Check Compliance" Button on Active Card | Kanban Card Action (All Columns) | Add "Compliance" badge/button to `KanbanCard`. Clicking opens `ComplianceChecker` modal. |
| **Template Marketplace** | "Templates" Tab | "New Lease" Dropdown | "New Lease" button becomes a split button or dropdown: "Start Blank" vs "Browse Templates". |
| **Collaborative Editor** | "Collaborate" Button | Kanban Card Click | Clicking a card opens the `CollaborativeLeaseEditor` in a full-screen modal or separate route. |

## 3. UI/UX Specifications

### 3.1 Header Area
- **Current:** Simple title + "New Lease" button.
- **New:**
    - **Title:** "Lease Pipeline"
    - **Actions:**
        - **Primary:** "New Lease" (Split Button)
            - Main click: Open Blank Wizard
            - Dropdown arrow: "Browse Templates" (Opens `LeaseTemplateMarketplace` modal)
        - **Secondary:** "Import/Export" (Icon buttons)

### 3.2 Kanban Card Enhancements (`KanbanCard.tsx`)
- **Visuals:**
    - Display **Compliance Score** badge (Green > 90, Yellow > 70, Red < 70).
    - Show **Clause Count** indicator.
- **Actions (Hover/Menu):**
    - **Draft Column:** "AI Suggestions", "Edit"
    - **Pending/Active Columns:** "Check Compliance", "View Details"

### 3.3 Modals & Dialogs
- **AI Assistant:** Reuse `AIClauseSuggestionEngine` component. Triggered from Draft cards.
- **Compliance Report:** Reuse `ComplianceChecker` component. Triggered from any card.
- **Template Gallery:** Reuse `LeaseTemplateMarketplace`. Triggered from Header.

## 4. User Flows

### Flow A: Creating a Lease from Template
1. User clicks arrow next to "New Lease".
2. Selects "Browse Templates".
3. `LeaseTemplateMarketplace` modal opens.
4. User selects a template -> `LeaseAgreementGenerator` opens with pre-filled data.
5. On Save -> New Card appears in "Draft" column.

### Flow B: AI-Assisted Drafting
1. User locates a card in "Draft" column.
2. Clicks "AI Assist" icon on the card.
3. `AIClauseSuggestionEngine` opens.
4. User accepts suggestions -> Lease updated in background.
5. Modal closes -> Card updates to show new clause count.

### Flow C: Compliance Check
1. User drags card from "Draft" to "Pending Approval".
2. **Optional:** Auto-trigger compliance check (Future V2).
3. **Current V1:** User clicks "Compliance" badge on card.
4. `ComplianceChecker` opens showing issues.
5. User fixes issues -> Score updates on card.

## 5. Technical Requirements
- **State Management:**
    - `LeasePipeline.tsx` must manage the visibility state for all 4 modals (Wizard, AI, Compliance, Templates).
    - Selected Lease ID must be tracked to pass to modals.
- **Lazy Loading:**
    - Continue to lazy load the heavy components (`AIClauseSuggestionEngine`, etc.) to maintain performance.
- **Dependencies:**
    - Ensure `LeaseManagementContext` or React Query hooks are correctly used to fetch/update data across these components.

## 6. Acceptance Criteria
- [ ] "New Lease" button supports creating from Template.
- [ ] Draft cards allow opening AI Clause Suggestions.
- [ ] All cards display Compliance Score.
- [ ] Compliance Checker can be opened for any lease.
- [ ] Legacy `EnhancedLeases.tsx` file is deleted.
- [ ] No console errors during modal interactions.