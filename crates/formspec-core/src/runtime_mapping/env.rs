//! Build [`fel_core::FormspecEnvironment`] for mapping transforms and conditions.

use fel_core::{FormspecEnvironment, json_to_fel};
use serde_json::Value;

/// Map `source` / `target` JSON into fields and `@source` / `@target` variables for FEL in rules.
pub(crate) fn build_mapping_env(
    source_doc: &Value,
    target_doc: &Value,
    dollar: Option<&Value>,
) -> FormspecEnvironment {
    let mut env = FormspecEnvironment::new();
    if let Some(value) = dollar {
        // Bare $ resolves from data[""] in the environment
        env.set_field("", json_to_fel(value));
    }
    if let Some(obj) = source_doc.as_object() {
        for (k, v) in obj {
            env.set_field(k, json_to_fel(v));
        }
    }
    // Set as both variables (@source/@target) and fields (source.x/target.x)
    // so FEL expressions can use either syntax.
    let source_fel = json_to_fel(source_doc);
    let target_fel = json_to_fel(target_doc);
    env.set_variable("source", source_fel.clone());
    env.set_variable("target", target_fel.clone());
    env.set_field("source", source_fel);
    env.set_field("target", target_fel);
    env
}
