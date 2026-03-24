//! Formspec layout planner — produces LayoutNode trees from definitions, themes, and component documents.

mod types;
mod defaults;
mod responsive;
mod params;
mod planner;

pub use types::*;
pub use defaults::get_default_component;
pub use responsive::resolve_responsive_props;
pub use params::interpolate_params;
pub use planner::{
    plan_component_tree, plan_definition_fallback, reset_node_id_counter,
    classify_component, extract_props, resolve_style_tokens_map,
    build_field_item_snapshot, build_tier1_hints,
};

#[cfg(feature = "eval-merge")]
mod eval_merge;

#[cfg(feature = "eval-merge")]
pub use eval_merge::{
    evaluate_and_merge, evaluate_and_merge_from_eval_result, EvaluatedNode, FieldValidation,
};

#[cfg(test)]
mod tests;
