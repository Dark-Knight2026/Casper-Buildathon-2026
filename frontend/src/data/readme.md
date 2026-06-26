# Static Data

Hard-coded demo data and seed fixtures used by the UI before / alongside live API calls.

| File | Responsibility |
|------|----------------|
| featuredProperties.ts | Static property records used by the public landing page and the `PropertyDetail` direct-URL fallback (so demo IDs `prop-1`...`prop-6` work without router state) |
| mockAgentPerformance.ts | Mock performance metrics for the agent marketplace dashboard |
| mockAgents.ts | Mock agent profiles powering the agent marketplace UI |
| mockProperties.ts | Mock property listings used across landlord/tenant search and detail demos |
| mock_leases.json | Seed lease records consumed by tenant lease views in demo mode |
| onboardingFlows.ts | Step / copy definitions for the onboarding wizard |
