//! Extension name pattern validation (`x-` prefix and segments).

/// Check if a name matches `^x-[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$`.
pub(super) fn is_valid_extension_name(name: &str) -> bool {
    let bytes = name.as_bytes();
    if bytes.len() < 3 || bytes[0] != b'x' || bytes[1] != b'-' {
        return false;
    }
    // After "x-", expect one or more segments separated by '-'.
    // Each segment: starts with [a-z], followed by [a-z0-9]*.
    let rest = &bytes[2..];
    if rest.is_empty() {
        return false;
    }
    let mut i = 0;
    loop {
        // Start of segment: must be [a-z]
        if i >= rest.len() || !rest[i].is_ascii_lowercase() {
            return false;
        }
        i += 1;
        // Rest of segment: [a-z0-9]*
        while i < rest.len() && (rest[i].is_ascii_lowercase() || rest[i].is_ascii_digit()) {
            i += 1;
        }
        // End of string or next segment
        if i == rest.len() {
            return true;
        }
        if rest[i] == b'-' {
            i += 1; // consume hyphen, next iteration expects a segment
        } else {
            return false; // invalid character
        }
    }
}
