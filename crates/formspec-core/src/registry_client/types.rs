//! Registry document types and parse errors.

use crate::extension_analysis::RegistryEntryStatus;

/// Extension mechanism category.
#[allow(missing_docs)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExtensionCategory {
    DataType,
    Function,
    Constraint,
    Property,
    Namespace,
}

/// Organization publishing a registry document.
#[allow(missing_docs)]
#[derive(Debug, Clone)]
pub struct Publisher {
    pub name: String,
    pub url: String,
    pub contact: Option<String>,
}

/// A single extension record with full metadata.
#[allow(missing_docs)]
#[derive(Debug, Clone)]
pub struct RegistryEntry {
    pub name: String,
    pub category: ExtensionCategory,
    pub version: String,
    pub status: RegistryEntryStatus,
    pub description: String,
    pub deprecation_notice: Option<String>,
    pub base_type: Option<String>,
    pub parameters: Option<Vec<Parameter>>,
    pub returns: Option<String>,
}

/// Function/constraint parameter declaration.
#[allow(missing_docs)]
#[derive(Debug, Clone)]
pub struct Parameter {
    pub name: String,
    pub param_type: String,
    pub description: Option<String>,
}

/// Errors from registry parsing and validation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RegistryError {
    /// Missing required top-level field.
    MissingField(String),
    /// Field has wrong type.
    InvalidField(String),
    /// Entry-level parse error (index, message).
    InvalidEntry(usize, String),
}

impl std::fmt::Display for RegistryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RegistryError::MissingField(field) => write!(f, "missing required field: {field}"),
            RegistryError::InvalidField(msg) => write!(f, "invalid field: {msg}"),
            RegistryError::InvalidEntry(idx, msg) => write!(f, "entry[{idx}]: {msg}"),
        }
    }
}

impl std::error::Error for RegistryError {}

/// A parsed registry document with indexed entries.
#[allow(missing_docs, clippy::missing_docs_in_private_items)]
#[derive(Debug)]
pub struct Registry {
    pub publisher: Publisher,
    pub published: String,
    pub(super) entries: Vec<RegistryEntry>,
    pub(super) by_name: std::collections::HashMap<String, Vec<usize>>,
}
