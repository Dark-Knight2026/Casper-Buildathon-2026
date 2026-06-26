# tests/lib

| Directory | Responsibility |
|-----------|----------------|
| utils/ | Tests for shared utility functions (cn, pluralize, etc.) |

| File | Responsibility |
|------|----------------|
| api-errors.test.ts | Tests the wire-format envelope parser, machine-readable error-code guard, and AvatarStatus constants |
| extendedSearchFilter.test.ts | Tests the demo extended-search predicate — in-home amenity AND-matching (case-insensitive, NW-1 undefined-amenities guard), nearest-POI distance, strict multi-category gating, combined pass |
