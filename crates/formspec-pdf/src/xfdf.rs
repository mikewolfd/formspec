//! XFDF round-trip — generate and parse XFDF XML for form data exchange.

use std::collections::HashMap;
use serde_json::Value;

/// Generate XFDF XML from field name→value pairs.
///
/// Produces a valid XFDF document per the Adobe XFDF specification.
pub fn generate_xfdf(fields: &HashMap<String, Value>) -> String {
    let mut xml = String::new();
    xml.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    xml.push_str("<xfdf xmlns=\"http://ns.adobe.com/xfdf/\" xml:space=\"preserve\">\n");
    xml.push_str("  <fields>\n");

    // Sort keys for deterministic output
    let mut keys: Vec<&String> = fields.keys().collect();
    keys.sort();

    for key in keys {
        let value = &fields[key];
        let value_str = match value {
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            Value::Bool(b) => b.to_string(),
            Value::Null => String::new(),
            _ => serde_json::to_string(value).unwrap_or_default(),
        };

        xml.push_str(&format!(
            "    <field name=\"{}\">\n      <value>{}</value>\n    </field>\n",
            escape_xml(key),
            escape_xml(&value_str)
        ));
    }

    xml.push_str("  </fields>\n");
    xml.push_str("</xfdf>\n");
    xml
}

/// Parse XFDF XML into field name→value pairs.
///
/// Uses simple string scanning — no XML parser dependency needed for the
/// straightforward XFDF format.
pub fn parse_xfdf(xfdf_xml: &str) -> Result<HashMap<String, Value>, String> {
    let mut fields = HashMap::new();
    let mut rest = xfdf_xml;

    while let Some(field_start) = rest.find("<field ") {
        rest = &rest[field_start..];

        // Extract field name
        let name = extract_attr(rest, "name")
            .ok_or_else(|| "Missing 'name' attribute on <field>".to_string())?;

        // Extract value
        let value = if let Some(vs) = rest.find("<value>") {
            let after_tag = &rest[vs + 7..];
            if let Some(ve) = after_tag.find("</value>") {
                unescape_xml(&after_tag[..ve])
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        // Try to parse as number or boolean, default to string
        let json_value = if value.is_empty() {
            Value::String(String::new())
        } else if value == "true" {
            Value::Bool(true)
        } else if value == "false" {
            Value::Bool(false)
        } else if let Ok(n) = value.parse::<i64>() {
            Value::Number(n.into())
        } else if let Ok(n) = value.parse::<f64>() {
            serde_json::Number::from_f64(n)
                .map(Value::Number)
                .unwrap_or(Value::String(value.clone()))
        } else {
            Value::String(value)
        };

        fields.insert(unescape_xml(&name), json_value);

        // Advance past this field
        if let Some(end) = rest.find("</field>") {
            rest = &rest[end + 8..];
        } else {
            // Self-closing or malformed — advance past the opening tag
            if let Some(end) = rest.find('>') {
                rest = &rest[end + 1..];
            } else {
                break;
            }
        }
    }

    Ok(fields)
}

/// Extract an attribute value from an XML tag.
fn extract_attr<'a>(tag: &'a str, attr: &str) -> Option<String> {
    let pattern = format!("{}=\"", attr);
    let start = tag.find(&pattern)?;
    let after = &tag[start + pattern.len()..];
    let end = after.find('"')?;
    Some(after[..end].to_string())
}

/// Escape special XML characters.
fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

/// Unescape XML character references.
fn unescape_xml(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
}

#[cfg(test)]
mod xfdf_tests {
    use super::*;

    #[test]
    fn round_trip_simple() {
        let mut fields = HashMap::new();
        fields.insert("name".to_string(), Value::String("John Doe".to_string()));
        fields.insert("age".to_string(), Value::Number(30.into()));
        fields.insert("active".to_string(), Value::Bool(true));

        let xml = generate_xfdf(&fields);
        let parsed = parse_xfdf(&xml).unwrap();

        assert_eq!(parsed.get("name"), Some(&Value::String("John Doe".to_string())));
        assert_eq!(parsed.get("age"), Some(&Value::Number(30.into())));
        assert_eq!(parsed.get("active"), Some(&Value::Bool(true)));
    }

    #[test]
    fn round_trip_special_chars() {
        let mut fields = HashMap::new();
        fields.insert("org".to_string(), Value::String("A & B <Corp>".to_string()));

        let xml = generate_xfdf(&fields);
        assert!(xml.contains("A &amp; B &lt;Corp&gt;"));

        let parsed = parse_xfdf(&xml).unwrap();
        assert_eq!(
            parsed.get("org"),
            Some(&Value::String("A & B <Corp>".to_string()))
        );
    }

    #[test]
    fn parse_empty_xfdf() {
        let xml = r#"<?xml version="1.0"?><xfdf><fields></fields></xfdf>"#;
        let parsed = parse_xfdf(xml).unwrap();
        assert!(parsed.is_empty());
    }
}
