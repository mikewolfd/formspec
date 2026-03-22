//! Registry client — parses registry documents, resolves extensions, validates lifecycle.

mod name;
mod parse;
mod registry;
mod types;
mod version;

#[cfg(test)]
mod tests;

pub use types::{ExtensionCategory, Parameter, Publisher, Registry, RegistryEntry, RegistryError};
pub use version::version_satisfies;

use crate::extension_analysis::RegistryEntryStatus;

/// Check whether a lifecycle transition is valid per the spec.
///
/// ```text
/// draft      → {draft, stable}
/// stable     → {stable, deprecated}
/// deprecated → {deprecated, retired, stable}  // un-deprecation allowed
/// retired    → {}  // terminal
/// ```
pub fn validate_lifecycle_transition(from: RegistryEntryStatus, to: RegistryEntryStatus) -> bool {
    use RegistryEntryStatus::*;
    matches!(
        (from, to),
        (Draft, Draft)
            | (Draft, Active)
            | (Active, Active)
            | (Active, Deprecated)
            | (Deprecated, Deprecated)
            | (Deprecated, Retired)
            | (Deprecated, Active) // un-deprecation
    )
}

/// Construct the well-known registry URL for a base URL.
pub fn well_known_url(base_url: &str) -> String {
    let base = base_url.trim_end_matches('/');
    format!("{base}/.well-known/formspec-extensions.json")
}
