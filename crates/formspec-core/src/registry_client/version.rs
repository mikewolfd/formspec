//! Loose semver-style version parsing and constraint matching for registry entries.

/// Parse a version string into (major, minor, patch), zero-padding to 3 parts.
pub(super) fn parse_version(v: &str) -> (u64, u64, u64) {
    let parts: Vec<u64> = v.split('.').filter_map(|p| p.parse().ok()).collect();
    (
        parts.first().copied().unwrap_or(0),
        parts.get(1).copied().unwrap_or(0),
        parts.get(2).copied().unwrap_or(0),
    )
}

/// Compare two version strings. Returns Ordering.
pub(super) fn compare_versions(a: &str, b: &str) -> std::cmp::Ordering {
    let va = parse_version(a);
    let vb = parse_version(b);
    va.cmp(&vb)
}

/// Check if `version` satisfies a space-separated constraint string.
/// Each token is an operator+version (e.g. `>=1.0.0`) or an exact version.
/// All tokens must match (AND semantics).
pub fn version_satisfies(version: &str, constraint: &str) -> bool {
    let v = parse_version(version);

    for token in constraint.split_whitespace() {
        let (op, ver_str) = if let Some(rest) = token.strip_prefix(">=") {
            (">=", rest)
        } else if let Some(rest) = token.strip_prefix("<=") {
            ("<=", rest)
        } else if let Some(rest) = token.strip_prefix('>') {
            (">", rest)
        } else if let Some(rest) = token.strip_prefix('<') {
            ("<", rest)
        } else {
            ("=", token)
        };

        let c = parse_version(ver_str);

        let ok = match op {
            ">=" => v >= c,
            "<=" => v <= c,
            ">" => v > c,
            "<" => v < c,
            _ => v == c,
        };

        if !ok {
            return false;
        }
    }

    true
}
