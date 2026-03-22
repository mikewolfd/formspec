//! Definition-level variable declarations.

/// A definition variable with optional scope.
#[derive(Debug, Clone)]
pub struct VariableDef {
    /// Variable name as declared in `variables`.
    pub name: String,
    /// FEL expression body (after optional `=` prefix stripped upstream).
    pub expression: String,
    /// Optional dotted path limiting where the variable is visible.
    pub scope: Option<String>,
}
