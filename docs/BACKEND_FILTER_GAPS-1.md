---
author: Anastasia
version: 0.1.0
created: 2026-06-16T00:00:00Z
last-modified: 2026-06-16T00:00:00Z
version-updated: 2026-06-16T00:00:00Z
---

# Applications — landlord side (PL-23b, post-hackathon extension)

The **tenant** flow is fully supported and wired (`POST /listings/{id}/applications`,
`GET /applications`). The **landlord** review pages model a richer domain than the
hackathon backend ships. **The FE Supabase code is removed** (no Supabase on the
frontend); the full landlord experience below is a **post-hackathon extension** —
build it once the backend grows these endpoints.

## Status enum — mostly the same, just naming + a few extras

The core three **are equivalent**, only renamed:

| FE         | Backend    |                           |
| ---------- | ---------- | ------------------------- |
| `pending`  | `pending`  | same                      |
| `approved` | `approved` | same                      |
| `denied`   | `rejected` | **same meaning, renamed** |

FE additionally has states the backend lacks — these are the real gap, not the core flow:
`draft` (application being filled, pre-submit), `under_review` (landlord actively reviewing),
`conditional` (conditional approval), and the `request_info` **action**.
→ Either extend the backend enum, or drop these extras and keep `pending/approved/rejected`.

## Structure / feature gap (this is the actual difference)

Same applicant data, but the FE wraps it richer and adds features the backend has no model for:

- **Scoring** — `applicationScore` + `ApplicationScoreBreakdown` (income 30 / credit 25 / … weights). Backend has no score.
- **Background checks** — credit / criminal / eviction (`BackgroundCheckService`). Backend has none.
- **Internal notes** — get/add notes per application. Backend has none.
- **Wider landlord actions** — approve / deny / **conditional** / **request_info** (+ notes + bg-check), vs the backend's single approve/reject.
- **Shape** — FE nests (`personalInfo.firstName`, `employmentInfo.*`, `references.*`); backend is flat (`fullName`, `employer`, …). Same fields, different nesting.

## Endpoints needed for the full landlord experience

Already shipped (tenant + minimal landlord):

| Method | Path                          | Status                            |
| ------ | ----------------------------- | --------------------------------- |
| POST   | `/listings/{id}/applications` | ✅ exists (tenant submit)         |
| GET    | `/applications`               | ✅ exists (tenant's own)          |
| GET    | `/listings/{id}/applications` | ✅ exists (landlord, per listing) |
| PUT    | `/applications/{id}/status`   | ✅ exists (approve/reject)        |

Needed for the full landlord experience:

| Method     | Path                                                    | Purpose                                                                                                                         | Priority |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------- |
| GET        | `/applications/landlord`                                | All of a landlord's applications across listings, paginated; filters: `status`, `search`, `listingId`, `dateRange`, score range | **high** |
| GET        | `/applications/{id}`                                    | Single application detail by id                                                                                                 | **high** |
| PUT        | `/applications/{id}/status` (extend)                    | Accept `under_review` / `conditional` / `request_info` if the richer status set is adopted                                      | medium   |
| GET / POST | `/applications/{id}/notes`                              | Internal landlord notes (list + add)                                                                                            | low      |
| POST       | `/applications/{id}/background-checks`                  | Request a check (`credit` / `criminal` / `eviction`)                                                                            | low      |
| GET        | `/applications/{id}/background-checks`                  | Read check results/status                                                                                                       | low      |
| GET        | `/applications/{id}/score`                              | Server-computed score breakdown (or ship `applicationScore` on the application)                                                 | low      |
| PATCH      | `/applications/{id}` + POST `/applications/{id}/submit` | Draft-then-submit flow (backend currently submits on create)                                                                    | low      |

> Note: an **application** is the tenant's request to rent a listing; the
> **agreement / lease** (`agreements_api.md`) is the separate, later contract a
> landlord creates after approving an applicant. Distinct domains.
