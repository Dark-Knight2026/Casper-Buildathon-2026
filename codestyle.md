# codestyle

## Rationale

This document provides a comprehensive set of coding standards for the Rust backend of the LeaseFi Backend. Given the critical nature of the backend—handling core business logic, financial transactions, and system infrastructure—a strict and detailed codestyle is essential for ensuring code quality, security, long-term maintainability, and consistency across the development team.

### Governing Principles

This project strictly follows the standard Rust style guide and uses `cargo fmt` as the mandatory baseline for all formatting. This rulebook serves as a supplement, defining higher-level conventions, architectural patterns, and a few critical exceptions to the standard.

For all low-level formatting (braces, spacing, indentation), the configuration enforced by `cargo fmt` is the source of truth, with one major exception: **this project uses 2-space indentation instead of the default 4 spaces.**

### Structure

Most rules in this document follow a consistent structure for clarity:

- **Description:** A detailed explanation of the rule's requirements.
- **Rationale:** An explanation of why the rule exists and the benefits of following it.
- **Examples:** `✅ Good` and `❌ Bad` examples illustrating correct and incorrect application of the rule.

### Vocabulary

- **Rulebook:** This document, which provides a set of guidelines for formatting Rust code.
- **Rule:** An individual guideline within this rulebook, designed to ensure consistency, readability, and maintainability.
- **Task Markers:** Specially formatted comment tags (e.g., `xxx:`, `qqq:`, `aaa:`) used to track tasks, questions, and resolutions directly within the source code.

### Quick Reference Summary

| Group                       | Rule                                                                                                                                                         | Description                                                                                                      |
|-----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| **Scope & Applicability**   | [Universal Applicability of Codestyle](#scope--applicability--universal-applicability-of-codestyle)                                                          | All codestyle rules apply universally to `.rs` files, Markdown snippets, and all comments.                       |
| **Imports & Modules**       | [Structuring: Prefer Specific, Local, and Grouped `use`](#imports--modules--structuring-prefer-specific-local-and-grouped-use)                               | Avoid global `use` statements; prefer specific, local imports. Group multiple imports from the same module.      |
|                             | [Structuring: `use of crate::*`](#imports--modules--structuring-use-of-crate)                                                                                | Use `super::*` for parent modules; `crate::*` sparingly for crate root.                                          |
|                             | [Structuring: Local Entities](#imports--modules--structuring-local-entities)                                                                                 | Prefer high-level module imports over granular ones for external crates.                                         |
|                             | [Structuring: Import Grouping Order](#imports--modules--structuring-import-grouping-order)                                                                   | Organize imports into three groups: `core`/`std`, external crates, internal modules — separated by blank lines.  |
|                             | [Structuring: Structuring `std` Imports](#imports--modules--structuring-structuring-std-imports)                                                             | Consolidate `std` imports; avoid multi-level nesting within `{}`.                                                |
|                             | [Structuring: Factor Common Paths in Imports and Declarations](#imports--modules--structuring-factor-common-paths-in-imports-and-declarations)               | Use `{}` to factor out common prefixes in `use` and `mod` statements.                                            |
|                             | [Structuring: Use Multi-Line Grouping for Complex Imports](#imports--modules--structuring-use-multi-line-grouping-for-complex-imports)                       | A `use` or `mod` group must be multi-line if it's long or has multiple sub-paths.                                |
|                             | [Structuring: Hierarchical Formatting for Multi-Line `use` Statements](#imports--modules--structuring-hierarchical-formatting-for-multi-line-use-statements) | Format complex `use` statements hierarchically across multiple lines.                                            |
|                             | [Structuring: Forbid Undeclared Workspace Dependencies](#imports--modules--structuring-forbid-undeclared-workspace-dependencies)                             | It is strictly forbidden for a crate to use a dependency not first declared in the workspace `Cargo.toml`.       |
|                             | [Mandatory 'enabled' and 'full' Features for Crate Toggling](#imports--modules--mandatory-enabled-and-full-features-for-crate-toggling)                      | Each workspace crate must have default `enabled` and `full` features to gate all its code and dependencies.      |
| **Lints & Docs**            | [Lints and warnings](#lints--docs--lints-and-warnings)                                                                                                       | Ensure no warnings from clippy with recommended lints enabled.                                                   |
|                             | [Strict Workspace Lint Inheritance](#lints--docs--strict-workspace-lint-inheritance)                                                                         | All lints MUST be defined in the workspace `Cargo.toml` and inherited by crates; no local overrides are allowed. |
|                             | [Single Source of Truth for Crate Documentation](#lints--docs--single-source-of-truth-for-crate-documentation)                                               | Crate-level documentation must be included from `readme.md` and not duplicated in source files.                  |
|                             | [Set `html_root_url` for Public Crates](#lints--docs--set-html_root_url-for-public-crates)                                                                   | Public crates must set the `html_root_url` attribute in `lib.rs` for correct link generation on docs.rs.         |
|                             | [Avoid Using Attributes for Documentation, Use Doc Comments](#lints--docs--avoid-using-attributes-for-documentation-use-doc-comments)                        | Use doc comments `//!` over attributes like `#![doc = ""]`.                                                      |
| **Testing**                 | [Centralized Test Directory](#testing--test-directory)                                                                                                       | All tests, including unit tests, must be located in the top-level `tests` directory.                             |
|                             | [Integration Test Feature Gating](#testing--integration-test-feature-gating)                                                                                 | Integration tests must be gated by a default-on `integration` feature.                                           |
| **Formatting & Whitespace** | [Attributes: Separate Attributes from Items](#formatting--whitespace--attributes-separate-attributes-from-items)                                             | Each attribute must be placed on its own line.                                                                   |
|                             | [Where Clause Formatting](#formatting--whitespace--where-clause-formatting)                                                                                  | Start `where` clause on a new line; list each parameter on a new line.                                           |
|                             | [Trait Implementation Formatting](#formatting--whitespace--trait-implementation-formatting)                                                                  | Start trait on a new line if it doesn't fit; consistent `where` clause.                                          |
|                             | [Function Signature Formatting](#formatting--whitespace--function-signature-formatting)                                                                      | Align parameters and return type; start `where` clause on a new line.                                            |
|                             | [Lifetime Annotations](#formatting--whitespace--lifetime-annotations)                                                                                        | No spaces between `&` and lifetime specifier.                                                                    |
|                             | [Nesting](#formatting--whitespace--nesting)                                                                                                                  | Avoid complex inline nesting; prefer splitting content across lines.                                             |
|                             | [Code Length](#formatting--whitespace--code-length)                                                                                                          | Keep lines under 110 characters; aim for concise functions.                                                      |
| **Comments**                | [Comments: Spaces](#comments--comments-spaces)                                                                                                               | Start inline comments with a space after `//`.                                                                   |
|                             | [Comments: Focus on Rationale, Preserve Existing Tasks](#comments--comments-focus-on-rationale-preserve-existing-tasks)                                      | Explain 'why', not 'what'; keep existing task comments (`TODO:`, `xxx:`).                                        |
|                             | [Comments: Define and Use Task Markers](#comments--comments-define-and-use-task-markers)                                                                     | Use structured `Task Markers` to track work and requests in code.                                                |
|                             | [Comments: Annotate Addressed Tasks](#comments--comments-annotate-addressed-tasks)                                                                           | Add `// aaa:` below existing task comments to explain findings/actions.                                          |
| **Macros**                  | [Declarative Macros, a. k. a. `macro_rules`](#macros--declarative-macros-a-k-a-macro_rules)                                                                  | Follow code style rules for macros with specific caveats.                                                        |
|                             | [`=>` Token](#macros---token)                                                                                                                                | Place `=>` on a separate line from macro pattern.                                                                |
|                             | [`{{` / `}}` in bodies](#macros-----in-bodies)                                                                                                               | Allow `{{` and `}}` on the same line for readability.                                                            |
|                             | [Short matches](#macros--short-matches)                                                                                                                      | Place short macro patterns and bodies on the same line.                                                          |
| **Naming Conventions**      | [File Naming](#naming-conventions--file-naming)                                                                                                              | All file names must use `snake_case` and be in all lowercase letters.                                            |
|                             | [Directory Naming: Avoid Redundant Prefixes](#naming-conventions--directory-naming-avoid-redundant-prefixes)                                                 | If a crate's name has a prefix matching its parent directory, remove the prefix from the crate's directory name. |
| **Error Handling**          | [`thiserror`](#error-handling--thiserror)                                                                                                                     | `thiserror` is the standard error handling library; `anyhow` is forbidden.                                       |

### Scope & Applicability : Universal Applicability of Codestyle

**Description:** This is a foundational, non-negotiable rule. The codestyle standards defined in this document are **strictly mandatory** and apply universally to **all Rust code**, regardless of where it appears. There are no exceptions.

This mandate extends beyond compilable Rust source files (`.rs`) to include:

- **Markdown Files:** All Rust code snippets within Markdown files (e.g., `README.md`, design documents) must adhere to these rules.
- **Documentation Comments:** All Rust code examples inside documentation comments (`///` and `//!`) must be perfectly formatted.
- **Standard Comments:** Any Rust code pasted into standard comments (`//` or `/* ... */`) for illustrative purposes must also follow the codestyle.

**Rationale:**

- **Universal Consistency:** Ensures that any code a developer sees, regardless of context, follows the same professional standard. This eliminates confusion and cognitive overhead.
- **Documentation Quality:** Guarantees that all examples are not only illustrative but also serve as models of correct, high-quality code that can be safely copied and used.
- **Professionalism:** A single, universally applied standard reflects a disciplined and professional approach to software development.

> ❌ **Bad** (A Markdown file with a non-compliant code snippet)

### Example Usage

Here is how you can use the `run` function.

```rust
// This example violates the codestyle.
fn main() {
    let result: i32 = run(5);
    println!("{}", result);
}
```

> ✅ **Good** (The same Markdown file with a compliant code snippet)

### Example Usage

Here is how you can use the `run` function.

```rust
// This example correctly follows the codestyle.
fn main() {
    let result: i32 = run(5);
    println!("{}", result);
}
```

### Imports & Modules : Structuring: Prefer Specific, Local, and Grouped `use`

- **Avoid Global `use`**: Do not use `use` statements at the crate root (`lib.rs` or `main.rs`) that are only needed in specific submodules. Place `use` statements within the modules where they are actually used.
- **Be Specific**: Import only the specific items needed (e.g., `use std::collections::HashMap;`) rather than using wildcards (e.g., `use std::collections::*;`) unless importing a prelude.
- **Group Imports**: When importing multiple items from the same crate or module, group them within curly braces `{}`.

> ❌ **Bad** (Global `use` only needed in `submodule`)

```rust
// lib.rs
use std::fs::File; // Only used in submodule
mod submodule;

// submodule.rs
fn open_file() -> std::io::Result<File> {
    File::open("foo.txt")
}
```

> ✅ **Good** (Local `use`)

```rust
// lib.rs
mod submodule;

// submodule.rs
use std::fs::File; // Used locally
fn open_file() -> std::io::Result<File> {
    File::open("foo.txt")
}
```

> ❌ **Bad** (Wildcard import)

```rust
use std::fmt::*;
```

> ✅ **Good** (Specific imports, grouped)

```rust
use std::fmt::{self, Debug, Display};
```

### Imports & Modules : Structuring: `use of crate::*`

- **Use `super::*` for Parent Modules**: When accessing items from a direct parent module, prefer `use super::Item;`.
- **Use `crate::*` Sparingly**: Use `crate::` primarily for accessing items from the crate root or distant modules where `super::` would be unclear or overly verbose. Avoid excessive `crate::` usage when `super::` is sufficient.

> ✅ **Good** (Using `super`)

```rust
// my_crate/mod.rs
pub struct ParentType;
mod child;

// my_crate/child.rs
use super::ParentType; // Accessing direct parent's item

fn use_parent() {
    let _p = ParentType;
}
```

> ✅ **Good** (Using `crate` for root access)

```rust
// my_crate/lib.rs
pub struct RootType;
mod level1;

// my_crate/level1/mod.rs
mod level2;

// my_crate/level1/level2.rs
use crate::RootType; // Accessing crate root item

fn use_root() {
    let _r = RootType;
}
```

> ❌ **Bad** (Using `crate` where `super` is clearer)

```rust
// my_crate/mod.rs
pub struct ParentType;
mod child;

// my_crate/child.rs
use crate::ParentType; // Less clear than `super::ParentType`

fn use_parent() {
    let _p = ParentType;
}
```

### Imports & Modules : Structuring: Local Entities

- **Prefer High-Level Imports for External Crates**: When using items from external crates, import the top-level module or the specific type directly (e.g., `use anyhow::Result;` or `use serde::Deserialize;`) rather than importing deeply nested items if the higher-level import provides sufficient access.
- **Use Full Paths for Clarity**: Within function bodies or other code blocks, if an import is not used, refer to items using their full path (e.g., `std::collections::HashMap::new()`) for clarity, especially for less frequently used items or to avoid ambiguity.

> ✅ **Good** (High-level external import)

```rust
use anyhow::Result; // Import the common Result type

fn my_func() -> Result<()> {
    // ... function body ...
    Ok(())
}
```

> ❌ **Bad** (Deeply nested external import, less common)

```rust
use anyhow::private::kind::TraitKind; // Avoid importing deep internal items unless necessary
```

> ✅ **Good** (Full path for clarity)

```rust
fn process_data() {
    let map = std::collections::HashMap::new(); // Clear where HashMap comes from
    // ...
}
```

### Imports & Modules : Structuring: Import Grouping Order

**Description:** Imports must be organized into three groups, each separated by a blank line. This follows the `StdExternalCrate` convention used by `rustfmt` (`group_imports = "StdExternalCrate"`).

1. **`core`/`std`** — standard library (prefer `core::` when the item is available there).
2. **External crates** — third-party and workspace dependencies.
3. **Internal modules** — `crate::`, `super::`, `self::`.

Within each group, imports are sorted alphabetically.

> ❌ **Bad** (All imports mixed together)

```rust
use crate::models::User;
use axum::Router;
use std::sync::Arc;
use serde::Serialize;
```

> ✅ **Good** (Three groups separated by blank lines)

```rust
use std::sync::Arc;

use axum::Router;
use serde::Serialize;

use crate::models::User;
```

### Imports & Modules : Structuring: Structuring `std` Imports

- **Consolidate `std` Imports**: Group all standard library imports together.
- **Avoid Multi-Level Nesting**: Do not nest imports deeply within curly braces. Prefer separate `use` statements for different top-level `std` modules (like `collections`, `fmt`, `io`).

> ❌ **Bad** (Deeply nested `std` imports)

```rust
use std::{
    collections::{HashMap, HashSet},
    fmt::{self, Debug, Display},
    io::{self, Read, Write},
};
```

> ✅ **Good** (Separate `use` for top-level `std` modules)

```rust
use std::collections::{HashMap, HashSet};
use std::fmt::{self, Debug, Display};
use std::io::{self, Read, Write};
```

### Imports & Modules : Structuring: Factor Common Paths in Imports and Declarations

**Description:** When importing multiple items from the same module or declaring multiple modules with a common parent, always factor out the common path prefix using curly braces `{}`. This is the primary principle for reducing redundancy.

> ❌ **Bad** (Repetitive paths)

```rust
use std::fmt::Debug;
use std::fmt::Display;
```

> ✅ **Good** (Common path factored out)

```rust
use std::fmt::{Debug, Display};
```

### Imports & Modules : Structuring: Use Multi-Line Grouping for Complex Imports

**Description:** A `use` or `mod` group **must** be formatted across multiple lines if it meets any of these criteria:

1. It imports from (or declares) two or more distinct submodules of a common root.
2. The single-line version would exceed the recommended line length.
3. It contains nested groups of its own.

This rule dictates *when* to use multi-line formatting. The specific formatting is defined in subsequent rules.

> ✅ **Good** (A simple group can be single-line)

```rust
use std::fmt::{Debug, Display};
```

> ✅ **Good** (This is complex and MUST be multi-line because it imports from `data` and `semantic`)

```rust
// This would be formatted according to the next rule
use unilang::{
    data::{...},
    semantic::SemanticAnalyzer,
};
```

### Imports & Modules : Structuring: Hierarchical Formatting for Multi-Line `use` Statements

**Description:** When a `use` statement must be multi-line (as per the previous rule), it must be formatted hierarchically. This improves readability for complex imports.

- The `use` keyword and common path prefix are followed by a newline.
- An indented opening brace `{` is placed on its own line.
- Each imported sub-path or item is on its own indented line.
- This nesting is applied recursively for sub-paths.
- A closing brace `}` is placed on its own line, aligned with the `use` keyword.

> ❌ **Bad** (Long single-line group and multiple separate `use` statements)

```rust
use unilang::data::{CommandDefinition, ArgumentDefinition, ArgumentAttributes, OutputData};
use unilang::semantic::SemanticAnalyzer;
```

> ✅ **Good** (Hierarchical, multi-line grouping)

```rust
use unilang::{
    data::{
        CommandDefinition,
        ArgumentDefinition,
        ArgumentAttributes,
        OutputData,
    },
    semantic::SemanticAnalyzer,
};
```

### Imports & Modules : Structuring: Centralized Workspace Dependency Manifest

**Description:** In a Cargo workspace, the root `Cargo.toml` **must** serve as the single source of truth for all dependency definitions. All dependencies—including their versions and sources—**must** be declared in the `[workspace.dependencies]` table. Feature flags **must not** be specified in this central manifest.

Member crates **must** inherit all dependencies from the workspace using the `workspace = true` syntax. A crate may specify the features it requires for an inherited dependency, but it is **strictly forbidden** from defining a dependency's version or source.

**Rationale:** This approach ensures consistent versions across the entire workspace, simplifies dependency management, reduces redundancy, and allows each crate to enable only the specific features it needs.

> ❌ **Bad** (Dependencies defined directly in crate `Cargo.toml`)

```toml
# my_crate/Cargo.toml
[dependencies]
# FORBIDDEN: This dependency is not inherited from the workspace.
rand = "0.8"
```

> ❌ **Bad** (Features specified in the workspace manifest)

```toml
# workspace_root/Cargo.toml
[workspace.dependencies]
# FORBIDDEN: Features must be specified in the consuming crate, not here.
serde = { version = "1.0", features = ["derive", "rc"] }
```

> ✅ **Good** (Dependencies defined in workspace; features specified in crate)

```toml
# workspace_root/Cargo.toml
[workspace.dependencies]
serde = { version = "1.0" }
rand = { version = "0.8" }

# my_crate_a/Cargo.toml
[dependencies]
# Correct: Inherited from workspace, features enabled locally.
serde = { workspace = true, features = ["derive"] }
rand = { workspace = true }

# my_crate_b/Cargo.toml
[dependencies]
# Correct: Inherited from workspace, different features enabled locally.
serde = { workspace = true, features = ["rc"] }
```

### Imports & Modules : Structuring: Forbid Undeclared Workspace Dependencies

**Description:** This is a rigid and non-negotiable rule. In a Cargo workspace, it is **strictly forbidden** for any member crate's `Cargo.toml` to reference a dependency—even using `workspace = true`—that has not first been explicitly declared in the `[workspace.dependencies]` table of the root `Cargo.toml` file. Every single dependency used by any crate in the workspace **must** originate from the central workspace definition. There are no exceptions. This rule complements the "[Structuring: Centralized Workspace Dependency Manifest](#imports--modules--structuring-centralized-workspace-dependency-manifest)" rule by making it an explicit error to bypass the central manifest.

**Rationale:**

- **Single Source of Truth:** Enforces the root `Cargo.toml` as the absolute single source of truth for all dependencies, their versions, and their sources.
- **Security and Compliance:** Prevents crates from introducing unvetted dependencies. It ensures all dependencies can be audited for security vulnerabilities and license compatibility from a single, central location.
- **Version Control:** Eliminates the possibility of version conflicts or resolution ambiguity that could arise from dependencies being declared ad-hoc within individual crates.

> ❌ **Bad** (Crate references a dependency not declared in the workspace)

```toml
# workspace_root/Cargo.toml
[workspace.dependencies]
# The 'phf_codegen' dependency is MISSING here.
serde = { version = "1.0" }

# my_crate/Cargo.toml
[dependencies]
# FORBIDDEN: 'phf_codegen' is not defined in [workspace.dependencies]
phf_codegen = { workspace = true }
serde = { workspace = true }
```

> ✅ **Good** (Dependency is declared in workspace, then inherited by the crate)

```toml
# workspace_root/Cargo.toml
[workspace.dependencies]
# Correct: All dependencies are declared here first.
phf_codegen = { version = "0.11", default-features = false }
serde = { version = "1.0" }

# my_crate/Cargo.toml
[dependencies]
# Correct: Both dependencies are inherited from the workspace.
phf_codegen = { workspace = true }
serde = { workspace = true }
```

### Imports & Modules : Mandatory 'enabled' and 'full' Features for Crate Toggling

**Description:** This is a rigid and non-negotiable rule for managing complex build configurations **for every crate that is a member of the workspace**. It does not apply to external, third-party dependencies. Every workspace crate **must** expose two specific features: `enabled` and `full`.

1. **`enabled` Feature:** This acts as a master switch for the entire crate.
    * It **must** be part of the `default` feature set, ensuring the crate is active by default.
    * It **must** activate all the crate's dependencies (which must be declared as optional).
2. **`full` Feature:** This feature provides a convenient way to enable all functionality.
    * It **must** be defined to include the `enabled` feature, along with any other optional features the crate provides.
3. **Dependency Gating:** All dependencies of the crate **must** be declared with `optional = true` and activated according to the following rules:
    * Dependencies used in the main crate must be enabled via the `enabled` feature.
    * Dependencies used **only** in integration tests must be enabled via the `integration` feature.
4. **Code Gating:** The entire functional code within the crate's entry points (`lib.rs`, `main.rs`, etc.) **must** be conditionally compiled under the `enabled` feature using `#![cfg(feature = "enabled")]`.

**Rationale:**
Cargo's feature system is additive, which makes it difficult to manage complex or mutually exclusive dependency sets. For example, if crate `A` depends on `B` with feature `X`, and crate `C` depends on `B` without feature `X`, feature `X` will still be enabled for `B` in the final build. The `enabled` feature pattern provides a robust workaround. It allows a crate to be completely "switched off" or compiled-out, even when it is included as a non-optional dependency by another crate, thus preventing its dependencies and code from affecting the final binary.

> ❌ **Bad** (Dependencies are not optional; code is not gated)

```toml
# my_crate/Cargo.toml
[dependencies]
# FORBIDDEN: Dependencies must be optional and gated by the "enabled" feature.
serde = { workspace = true }``````rust
// my_crate/src/lib.rs
// FORBIDDEN: The crate's code is not conditionally compiled.
pub fn my_api() -> bool {
true
}
```

> ✅ **Good** (Correct implementation of the `enabled` and `full` feature pattern)

```toml
# my_crate/Cargo.toml

[features]
# The crate is enabled by default.
default = ["enabled"]
# The master switch that activates all dependencies.
enabled = ["dep:serde", "dep:log"]
# The 'full' feature enables all other features, including 'enabled'.
full = ["enabled"]

[dependencies]
# All dependencies are optional.
serde = { workspace = true, optional = true }
log = { workspace = true, optional = true }
``````rust
// my_crate/src/lib.rs

// This attribute prevents "unused" warnings when the feature is disabled.
#![cfg_attr(not(feature = "enabled"), allow(unused))]

// The entire module is gated by the "enabled" feature.
#[cfg(feature = "enabled")]
mod implementation {
// All your crate's code and modules go here.
pub fn my_api() -> bool {
true
}
}

#[cfg(feature = "enabled")]
pub use implementation::*;
```

### Lints & Docs : Lints and warnings

Make sure you have no warnings from clippy with these lints enabled.

**Recommended Lints Configuration:**

> ✅ **Good**

```toml
[workspace.lints.rust]
# Denies non-idiomatic code for Rust 2018 edition.
rust_2018_idioms = { level = "warn", priority = -1 }
# Denies using features that may break in future Rust versions.
future_incompatible = { level = "warn", priority = -1 }
# Warns if public items lack documentation.
missing_docs = "warn"
# Warns for public types not implementing Debug.
missing_debug_implementations = "warn"
# Denies all unsafe code usage.
unsafe-code = "deny"

[workspace.lints.clippy]
# Denies pedantic lints, enforcing strict coding styles and conventions.
pedantic = { level = "warn", priority = -1 }
# Denies undocumented unsafe blocks.
undocumented_unsafe_blocks = "deny"
# Denies to prefer `core` over `std` when available, for `no_std` compatibility.
std_instead_of_core = "warn"
# Denies including files in documentation unconditionally.
doc_include_without_cfg = "warn"
# Denies missing inline in public items.
missing_inline_in_public_items = "warn"

# exceptions

# Allows functions that are only called once.
single_call_fn = "allow"
# Allows forcing a function to always be inlined.
inline_always = "allow"
# Allows item names that repeat the module name (e.g., `mod user { struct User; }`).
module_name_repetitions = "allow"
# Allows using fully qualified paths instead of `use` statements.
absolute_paths = "allow"
# Allows wildcard imports (e.g., `use std::io::*;`).
wildcard_imports = "allow"
# Allow to prefer `alloc` over `std` when available, for `no_std` compatibility.
std_instead_of_alloc = "allow"
# Allow put definitions of struct at any point in functions.
items_after_statements = "allow"
# Allow precission loss, for example during conversion from i64 to f64
cast_precision_loss = "allow"
# Allows `pub use` statements.
pub_use = "allow"
# Allows the `?` operator.
question_mark_used = "allow"
# Allows implicit returns.
implicit_return = "allow"
# Allow ordering of fields in intuitive way.
arbitrary_source_item_ordering = "allow"
# Allow mod.rs files
mod_module_files = "allow"
# Allow missing docs for private items
missing_docs_in_private_items = "allow"
```

### Lints & Docs : Strict Workspace Lint Inheritance

**Description:** This is a rigid and non-negotiable rule. In a Cargo workspace, the root `Cargo.toml` serves as the **single, authoritative manifest for all lint configurations**. All lint settings for both `rustc` (`[workspace.lints.rust]`) and `clippy` (`[workspace.lints.clippy]`) **must** be defined exclusively in the root `Cargo.toml`.

Member crates **must not** define their own lint configurations. The `[lints]` section in a member crate's `Cargo.toml` must contain **only** the line `workspace = true` and nothing else. It is **strictly forbidden** for a member crate to define its own `[lints.rust]` or `[lints.clippy]` tables, override individual lints, or use `#![...]` attributes in source files for lint configuration.

**Rationale:**

- **Universal Code Quality:** Enforces a single, consistent standard of code quality and style across every crate in the workspace.
- **Simplified Maintenance:** Prevents configuration drift and simplifies updates, as all lint settings are managed in one place.
- **Clarity and Predictability:** Ensures that the build and CI process behaves predictably for all crates, without hidden or crate-specific lint overrides.

> ❌ **Bad** (Defining lints in a crate's `Cargo.toml`)

```toml
# my_crate/Cargo.toml
[lints.rust] # FORBIDDEN: Lints must not be defined in a member crate.
unsafe_code = "deny"
```

> ❌ **Bad** (Overriding lints in a crate's `Cargo.toml`)

```toml
# my_crate/Cargo.toml
[lints]
workspace = true
# FORBIDDEN: Overriding or adding lints is not allowed.
[lints.clippy]
pedantic = "allow"
```

> ❌ **Bad** (Defining lints in a source file)

```rust
// my_crate/src/lib.rs
// FORBIDDEN: Lints must not be defined in source files.
#![deny(unsafe_code)]
```

> ✅ **Good** (Lints are defined centrally in the workspace and inherited by the crate)

```toml
# workspace_root/Cargo.toml
[workspace.lints.rust]
unsafe_code = "deny"
missing_docs = "warn"

[workspace.lints.clippy]
pedantic = "warn"

# my_crate/Cargo.toml
# Correct: The [lints] section contains ONLY the workspace inheritance line.
[lints]
workspace = true
```

### Lints & Docs : Single Source of Truth for Crate Documentation

**Description:** To avoid duplication and ensure consistency, the `readme.md` file **must** serve as the single source of truth for crate-level documentation. All library (`lib.rs`) and binary (`main.rs` or `src/bin/*.rs`) entry points **must** include the contents of the `readme.md` file as their inner doc comments.

The **only acceptable method** is to use a two-part approach at the top of the entry file:

1. A single-line inner doc comment (`//!`) providing a brief crate summary. This satisfies the `missing_docs` lint during normal builds and tests.
2. The conditional `cfg_attr` attribute immediately following it to include the full `readme.md` content when building documentation (`cargo doc`).

**Rationale:**

- **DRY (Don't Repeat Yourself):** Prevents documentation from becoming out of sync between the README and the crate's own docs.
- **Warning-Free Builds:** The summary doc comment satisfies the `missing_docs` lint without needing to suppress it, ensuring a clean build process.
- **Maintainability:** Simplifies documentation updates by requiring changes in only one location.

> ❌ **Bad** (Manually duplicating documentation in `lib.rs`)

```rust
// In src/lib.rs
//! # My Crate
//!
//! This is a crate that does amazing things. It is the same text
//! that is present in the readme.md file, which leads to duplication.
```

> ❌ **Bad** (Suppressing the `missing_docs` lint)

```rust
// In src/lib.rs
// FORBIDDEN: This method is not acceptable as it suppresses a useful lint.
#![cfg_attr(not(doc), allow(missing_docs))]
#![cfg_attr(doc, doc = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/", "readme.md")))]
```

> ✅ **Good** (Providing a summary comment and conditionally including the README)

```rust
// In src/lib.rs
// Correct: A one-line summary satisfies the `missing_docs` lint, and the full
// README is included only when building documentation.
//! A brief, one-line summary of the crate.
#![cfg_attr(doc, doc = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/", "readme.md")))]
```

### Lints & Docs : Set `html_root_url` for Public Crates

**Description:** For any public-facing crate (i.e., intended for publishing to `crates.io`), the `lib.rs` file **must** include the `html_root_url` attribute. This attribute is critical for `docs.rs` to correctly generate links to items from other crates in your documentation. The URL should be formatted as `https://docs.rs/CRATE_NAME/latest/CRATE_NAME/`, replacing `CRATE_NAME` with the actual name of your crate.

> ❌ **Bad** (A public crate missing the attribute)

```rust
// In a public crate's src/lib.rs
// FORBIDDEN: Missing the html_root_url attribute, which will result in broken
// links for external types in the generated documentation on docs.rs.
#![deny(missing_docs)]
```

> ✅ **Good** (The attribute is correctly set)

```rust
// In a public crate's src/lib.rs
// Correct: The html_root_url is set, ensuring correct link generation.
// Replace `your_crate_name` with the actual crate name.
#![doc(html_root_url = "https://docs.rs/your_crate_name/latest/your_crate_name/")]
#![deny(missing_docs)]
```

### Lints & Docs : Avoid Using Attributes for Documentation, Use Doc Comments

For documenting code, prefer using ordinary doc comments `//!` over attributes like `#![doc = ""]`. Doc comments are more conventional and readable, aligning with Rust's idiomatic documentation practices. This approach ensures consistency in how documentation is written and maintained across the codebase.

> ❌ **Bad**
Using the `doc` attribute for documentation can disrupt the visual flow and consistency of source code documentation.

```rust
#![doc = "Description of file."]

#[doc = "Implements a new type of secure connection."]
mod secure_connection {
    #[doc = "Establishes a secure link."]
    pub fn establish() {}
}
```

> ✅ **Good**
Ordinary doc comments `//!` and `///` provide a clearer, more idiomatic way to document modules and functions, enhancing readability.

```rust
//! Description of file.

/// Implements a new type of secure connection.
mod secure_connection {
    /// Establishes a secure link.
    pub fn establish() {}
}
```

### Testing : Test Directory

**Description:** This is a rigid and non-negotiable rule. All tests, including unit tests, integration tests, and benchmarks, **must** be located in the `tests` directory of the crate alongside the `src` directory. It is **strictly forbidden** to have a `#[cfg(test)]` module or any `#[test]` functions inside the `src` directory. There are no exceptions.

**Rationale:**

- **Strict Separation of Concerns:** Enforces a clean boundary between production code (`src`) and test code (`tests`).
- **Faster Builds:** `cargo build` and `cargo check` will not analyze or compile any test code, leading to faster development cycles.
- **Simplified Configuration:** Eliminates the need for complex `#[cfg(test)]` attributes within the source code, making it cleaner and more focused.
- **Unified Test Environment:** All tests can be discovered and run from a single, predictable location.

> ❌ **Bad** (Inline test module in `src`)

```rust
// In src/my_module.rs
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// FORBIDDEN: Test modules are not allowed in the `src` directory.
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 2), 4);
    }
}
```

> ✅ **Good** (Test code is in the `tests` directory)

```text
// Crate directory structure:
// ├── Cargo.toml
// ├── src
// │   └── lib.rs
// └── tests
//     └── basic_test.rs
```

```rust
// In tests/basic_test.rs
// Import the crate being tested.
use my_crate::add;

#[test]
fn test_add_from_outside() {
    assert_eq!(add(2, 2), 4);
}
```

### Testing : Integration Test Feature Gating

**Description:** All integration tests **must** be conditionally compiled using a feature named `integration`. This feature **must** be included in the crate's `default` feature set in its `Cargo.toml`. This allows developers to optionally exclude slow or environment-dependent tests from normal build and test cycles.

**Implementation:**

1. In `Cargo.toml`, define the `integration` feature and add it to the `default` list.
2. At the top of each integration test file in the `tests` directory, add the attribute `#![cfg(feature = "integration")]`.

**Rationale:**

- **Build Flexibility:** Allows for running `cargo test --no-default-features` to execute only the unit tests (if any) and skip integration tests.
- **CI Optimization:** CI pipelines can have separate, faster jobs that run without default features, and slower, more comprehensive jobs that run with the `integration` feature enabled.

> ❌ **Bad** (Integration test file without a feature gate)

```rust
// In tests/my_integration_test.rs
// FORBIDDEN: This test will always run and cannot be disabled via features.

#[test]
fn test_database_connection() {
    // ... some slow test ...
}
```

> ✅ **Good** (Correct `Cargo.toml` and feature-gated test file)

```toml
# In Cargo.toml
[features]
default = ["integration"]
integration = []
```

```rust
// In tests/my_integration_test.rs
// Correct: This entire test file is gated by the `integration` feature.
#![cfg(feature = "integration")]

#[test]
fn test_database_connection() {
    // ... some slow test ...
}
```

### Formatting & Whitespace : Attributes: Separate Attributes from Items

**Description:** Each attribute (`#[...]` or `#![...]`) must be placed on its own line. Furthermore, the entire block of attributes annotating an item (like a struct, enum, function, field, etc.) must be separated from the item itself by a newline. This ensures clear visual separation between metadata (attributes) and the code element they modify.

> ❌ **Bad** (Attribute on same line as item)

```rust
#[derive(Debug)]
struct MyStruct {
    field: i32
}

struct AnotherStruct {
    #[serde(skip)] pub data: String,
}

#[inline]
fn my_function() {}
```

> ❌ **Bad** (Multiple attributes, last one on same line as item)

```rust
#[derive(Debug)]
#[serde(rename = "my_struct")]
struct MyStruct {
    field: i32
}

struct YetAnotherStruct {
    /// Some doc comment
    #[serde(skip)]
    #[repr(transparent)] pub value: i32,
}
```

> ✅ **Good** (Attributes on separate lines above the item)

```rust
#[derive(Debug)]
struct MyStruct {
    field: i32,
}

struct AnotherStruct {
    #[serde(skip)]
    pub data: String,
}

#[inline]
fn my_function() {
    // ...
}

#[derive(Debug)]
#[serde(rename = "my_struct")]
struct MyStruct2 {
    field: i32,
}

struct YetAnotherStruct {
    /// Some doc comment
    #[serde(skip)]
    #[repr(transparent)]
    pub value: i32,
}
```

### Formatting & Whitespace : Where Clause Formatting

- New Line for Where Clause : The `where` keyword should start on a new line when the preceding function, struct, or impl declaration line is too long, or when it contributes to better readability.
- One Parameter Per Line : Each parameter in the `where` clause should start on a new line. This enhances readability, especially when there are multiple constraints or when constraints are lengthy.

> ✅ **Good**

```rust
impl<K, Definition> CommandFormer<K, Definition>
where
    K: core::hash::Hash + std::cmp::Eq,
    Definition: former::FormerDefinition,
    Definition::Types: former::FormerDefinitionTypes<Storage = CommandFormerStorage<K>>,
{
    // Implementation goes here
}
```

> ❌ **Bad**

```rust
impl<K, Definition> CommandFormer<K, Definition>
where
    K: core::hash::Hash + std::cmp::Eq,
    Definition: former::FormerDefinition,
    Definition::Types: former::FormerDefinitionTypes<Storage = CommandFormerStorage<K>>
{
    // Implementation goes here
}
```

### Formatting & Whitespace : Trait Implementation Formatting

- **Trait on New Line**: When defining a trait implementation (`impl`) for a type, if the trait and the type it is being implemented for do not fit on the same line, the trait should start on a new line.
- **Consistent Where Clause**: The `where` clause should also start on a new line to maintain readability, especially when there are constraints or multiple bounds.

> ✅ **Good**

```rust
impl<K, __Context, __Formed> ::Trait1 for CommandFormerDefinitionTypes<K, __Context, __Formed>
where
    K: core::hash::Hash + std::cmp::Eq,
{}
```

> ❌ **Bad**

```rust
impl<K, __Context, __Formed> ::Trait1 for CommandFormerDefinitionTypes<K, __Context, __Formed>
where
    K: core::hash::Hash + std::cmp::Eq,
{}
```

### Formatting & Whitespace : Function Signature Formatting

- **Parameter Alignment**: Function parameters should be listed with one per line, each starting on a new line after the opening parenthesis. This enhances readability and version control diff clarity.
- **Return Type on New Line**: The return type should start on a new line when the parameters or function signature is too long or for consistency with the rest of the codebase.
- **Where Clause Alignment**: The `where` clause should start on a new line, aligning it consistently beneath the function signature, not inline with the last parameter or return type.

> ✅ **Good**

```rust
#[inline(always)]
pub fn begin<IntoEnd>(
    mut storage: core::option::Option<<Definition::Types as former::FormerDefinitionTypes>::Storage>,
    context: core::option::Option<<Definition::Types as former::FormerDefinitionTypes>::Context>,
    on_end: IntoEnd,
) -> Self
where
    IntoEnd: ::core::convert::Into<<Definition as former::FormerDefinition>::End>,
{}
```

> ❌ **Bad**

```rust
#[inline(always)]
pub fn begin<IntoEnd>(mut storage: core::option::Option<<Definition::Types as former::FormerDefinitionTypes>::Storage>, context: core::option::Option<<Definition::Types as former::FormerDefinitionTypes>::Context>, on_end: IntoEnd) -> Self where
    IntoEnd: ::core::convert::Into<<Definition as former::FormerDefinition>::End>
{}
```

### Formatting & Whitespace : Lifetime Annotations

- **No Spaces Around Lifetime Specifier**: When using lifetime annotations (e.g., `'a`), do not include spaces between the ampersand `&` and the lifetime specifier.

> ✅ **Good**

```rust
fn info<'a>(src: &'a str) -> &'a str {
    src
}
```

> ❌ **Bad**

```rust
fn info<'a>(src: &'a str) -> &'a str {
    src
}
```

### Formatting & Whitespace : Nesting

- Avoid complex, multi-level inline nesting. Prefer splitting content across multiple lines.
- Opt for shorter, clearer lines over long, deeply nested ones to enhance code maintainability.
- The mandatory 2-space indentation rule helps mitigate excessive horizontal drift in nested code.

### Formatting & Whitespace : Code Length

- Aim for concise, focused functions to improve both readability and ease of maintenance.
- Keep lines under 110 characters to accommodate various editor and IDE setups without horizontal scrolling.

### Comments : Comments: Spaces

- Inline comments (`//`) should start with a space following the slashes for readability.

### Comments : Comments: Focus on Rationale, Preserve Existing Tasks

**Description:** Comments should primarily explain the "why" or clarify non-obvious aspects of the *current* code. Avoid adding comments that merely state *what* change was just made (e.g., "Removed unused import", "Added derive") or serve purely as a historical log. Such transitory comments clutter the code without providing lasting value.

**Crucially, do not remove existing task-tracking comments.** These are typically prefixed with labels like `TODO:`, `FIXME:`, `xxx:`, `qqq:`, `ppp:`, `yyy:`, `iii:`, or similar conventions, and are essential for project management and future development. See the "[Comments: Define and Use Task Markers](#comments--comments-define-and-use-task-markers)" rule for guidance on adding *new* tasks and the "[Comments: Annotate Addressed Tasks](#comments--comments-annotate-addressed-tasks)" for annotating existing ones.

> ❌ **Bad** (Comment describes the *change*, not the *code*)

```rust
// Removed unused import: use std::collections::HashMap;
use std::fmt;

struct MyData {
    // Added field for caching
    cache_value: Option<i32>,
}
```

> ✅ **Good** (No comment needed for obvious change, or comment explains *why*)

```rust
use std::fmt; // No comment needed for simple removal

struct MyData {
    /// Stores a cached computation result to avoid re-calculation.
    /// Cleared when relevant inputs change.
    cache_value: Option<i32>,
}
```

> ✅ **Good** (Preserving existing task comments)

```rust
use std::fmt;

struct MyData {
    // TODO: Implement proper caching logic here. // Keep existing TODO
    // xxx: Consider using a different Option type for performance. // Keep existing xxx
    cache_value: Option<i32>,
}
```

### Comments : Comments: Define and Use Task Markers

**Description:** Use structured `Task Markers` in source code comments to track tasks, requests, and their resolutions. This practice connects the codebase directly to the task management process.

**Schema:**
`// <marker> : [optional context/person] : <description>`

- The description can be multi-line, with subsequent lines also commented.

**Marker Types & Meanings:**

- `xxx:`, `todo:`: A general-purpose task or something that needs to be done. Prefer `xxx:` for consistency.
- `qqq:`: A question or a request for a decision, often from a team lead to a developer. The developer should not change the `qqq:` line itself but should respond with an `aaa:` marker.
- `aaa:`: An answer or a report on an action taken in response to another marker (typically a `qqq:` or `xxx:`). It should be placed directly below the marker it addresses.
- `zzz:`: A low-priority task that can be deferred.

> ✅ **Good** (Using various task markers)

```rust
// xxx: @dev-team : This function is inefficient and needs to be refactored.
// It currently uses a linear search, but a HashMap would be better.
fn find_item_slowly(id: &str) -> Option<Item> { /* ... */ }

// qqq: @lead-dev : Should we support legacy format v1 in this parser?
// Supporting it adds complexity but maintains backward compatibility.
fn parse_data(data: &[u8]) -> Result<Data, ParseError> { /* ... */ }

// aaa: @dev : Yes, we need to support v1 for now. Please proceed.
// (This would be the response to the qqq above)

// zzz: The logging here is a bit verbose. Could be cleaned up in the future.
log::debug!("Processing item: {:?}", item);
```

### Comments : Comments: Annotate Addressed Tasks

**Description:** When addressing or investigating an existing task comment (e.g., `// TODO:`, `// xxx:`, `// FIXME:`), **do not remove the original task comment**. Instead, add a new comment line immediately below it, starting with `// aaa:` (for "addressed" or "analyzed"), explaining the findings, actions taken, or current status regarding that specific task. This preserves the original context while providing an update.

> ❌ **Bad** (Removing the original task comment)

```rust
fn calculate_value() -> i32 {
    // Original comment was: // xxx: This calculation might be wrong for edge cases.
    // aaa: Reviewed calculation, seems correct for expected inputs.
    5 // Calculation logic
}
```

> ❌ **Bad** (Adding `aaa:` comment far away from the original task)

```rust
fn calculate_value() -> i32 {
    // xxx: This calculation might be wrong for edge cases.
    let result = 5; // Calculation logic
    // ... other code ...
    // aaa: Reviewed calculation, seems correct for expected inputs. // Annotation is disconnected
    result
}
```

> ✅ **Good** (Adding `aaa:` annotation directly below the original task)

```rust
fn calculate_value() -> i32 {
    // xxx: This calculation might be wrong for edge cases.
    // aaa: Reviewed calculation, seems correct for expected inputs based on current requirements.
    5 // Calculation logic
}

fn another_function() {
    // TODO: Refactor this section for clarity.
    // aaa: Refactored loop structure and added comments.
    for i in 0..10 {
        // ... complex logic ...
    }
}
```

### Macros : Declarative Macros, a. k. a. `macro_rules`

Overall, code style for macros is the same as for the simple code, but there are some caveats you should know.

### Macros : `=>` Token

Generally, `=>` token should reside on a separate line from macro pattern

> ❌ **Bad**

```rust
macro_rules! count {
    ( @count $( $rest:expr ),* ) => (
        /* body */
    );
}
```

> ❌ **Bad**

```rust
macro_rules! count {
    (
        @count $( $rest:expr ),*
    ) => (
        /* body */
    );
}
```

> ✅ **Good**

```rust
macro_rules! count {
    (
        @count $( $rest:expr ),*
    ) => {
        /* body */
    };
}
```

### Macros : `{{` / `}}` in bodies

You are allowed to place the starting `{{` and the ending `}}` on the same line to improve readability

> ❌ **Bad**

```rust
macro_rules! hmap {
    (
        /* pattern */
    ) => {
        {
            let _cap = hmap!(@count $( $key ),*);
            let mut _map = std::collections::HashMap::with_capacity(_cap);
            $(
                let _ = _map.insert($key.into(), $value.into());
            )*
            _map
        }
    };
}```

> ✅ * * Good* *

```rust
macro_rules! hmap {
    (
        /* pattern */
    ) => {{
        let _cap = hmap!(@count $( $key ),*);
        let mut _map = std::collections::HashMap::with_capacity(_cap);
        $(
            let _ = _map.insert($key.into(), $value.into());
        )*
        _map
    }};
}
```

### Macros : Short matches

You can place the macro pattern and its body on the same line if they are short enough.

> ❌ **Bad**

```rust
macro_rules! empty {
    (
        @single $( $x:tt )*
    ) => {
        ()
    };
}
```

> ✅ **Good**

```rust
macro_rules! empty {
    ( @single $( $x:tt )* ) => (());
}
```

### Naming Conventions : File Naming

All file names must use `snake_case` and be in all lowercase letters. This rule applies universally to all files within the repository, including source code, documentation (`readme.md`), and license files (`license`).

> ✅ **Good**

```text
my_module.rs
readme.md
license
```

> ❌ **Bad**

```text
MyModule.rs
my-module.rs
README.md
LICENSE
```

### Naming Conventions : Directory Naming: Avoid Redundant Prefixes

**Description:** If a crate's name contains a prefix that matches the name of its parent directory, this prefix **must** be removed from the crate's own directory name on the filesystem. The full crate name, including the prefix, **must** be preserved in its `Cargo.toml` file.

**Rationale:** This convention eliminates redundancy and "stuttering" in file paths (e.g., `api/api_gemini`), leading to cleaner, more intuitive project navigation. It keeps the filesystem organized by logical grouping (the parent directory) while ensuring the crate's canonical name remains explicit for dependency management and publishing purposes.

> ❌ **Bad** (Redundant `api` prefix in the directory name)

```text
// Filesystem structure
└── api/
    └── api_gemini/  <-- Redundant prefix
        └── Cargo.toml
```

```toml
# In api/api_gemini/Cargo.toml
[package]
name = "api_gemini"
```

> ✅ **Good** (Prefix is removed from the directory name, but kept in `Cargo.toml`)

```text
// Filesystem structure
└── api/
    └── gemini/      <-- Clean, non-redundant
        └── Cargo.toml
```

```toml
# In api/gemini/Cargo.toml
[package]
name = "api_gemini" # The full name is preserved here
```

### Error Handling : `thiserror`

`thiserror` is the standard error handling library for this project. The use of `anyhow` is forbidden to ensure structured, typed error management across the codebase.

**Usage guidelines:**

- Use `thiserror` for all error types that need `#[derive(Error)]`, custom `Display` formatting, or `#[from]` conversions.
- Always import directly: `use thiserror::Error;`.

> ✅ **Good** (Using `thiserror`)

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Invalid token")]
    InvalidToken,
    #[error("Token expired")]
    Expired,
}
```

> ❌ **Bad** (Using `anyhow`)

```rust
// Using anyhow is forbidden — use typed errors instead
use anyhow::Result;

fn do_anyhow_thing() -> Result<()> {
    // ...
    Ok(())
}
```
