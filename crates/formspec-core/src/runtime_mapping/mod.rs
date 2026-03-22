//! Bidirectional mapping engine for transforming data between formats.
//!
//! Executes mapping rules to transform data between Formspec response format and external formats
//! (forward: Formspec → external, reverse: external → Formspec). Implementation is split across
//! `types`, `path`, `env`, `transforms`, `engine`, and `document`.

mod document;
mod engine;
mod env;
mod path;
mod transforms;
mod types;

#[cfg(test)]
mod tests;

pub use document::execute_mapping_doc;
pub use engine::execute_mapping;
pub use types::*;
