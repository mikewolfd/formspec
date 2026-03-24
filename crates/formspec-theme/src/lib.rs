//! Formspec theme cascade resolver — 6-level merge, token resolution, widget fallback chains.
//!
//! Implements spec-normative theme behaviors:
//! - SS5.5: 6-level cascade (renderer defaults, formPresentation, item presentation, theme defaults, selectors, items)
//! - SS5.6: `"none"` sentinel suppresses inherited `widget` and `labelPosition`
//! - SS5.3: All matching selectors apply (document order)
//! - SS3.3-3.4: Token resolution (component > theme > renderer defaults)
//! - SS4.3: Widget fallback chain with `isAvailable` predicate

mod types;
mod cascade;
mod tokens;
mod widgets;

pub use types::*;
pub use cascade::resolve_presentation;
pub use tokens::{resolve_token, resolve_style_tokens};
pub use widgets::{
    resolve_widget, widget_token_to_component, KNOWN_COMPONENT_TYPES,
    SPEC_WIDGET_TO_COMPONENT, COMPONENT_TO_HINT, COMPATIBILITY_MATRIX,
};

#[cfg(test)]
mod tests;
