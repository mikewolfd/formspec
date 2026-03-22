//! JSON parsing helpers for registry documents.

use serde_json::Value;

use crate::extension_analysis::RegistryEntryStatus;

use super::types::{ExtensionCategory, Parameter, Publisher, RegistryEntry, RegistryError};

pub(super) fn parse_publisher(val: &Value) -> Result<Publisher, RegistryError> {
    let obj = val
        .as_object()
        .ok_or_else(|| RegistryError::InvalidField("publisher must be an object".into()))?;
    let name = obj
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| RegistryError::MissingField("publisher.name".into()))?
        .to_string();
    let url = obj
        .get("url")
        .and_then(|v| v.as_str())
        .ok_or_else(|| RegistryError::MissingField("publisher.url".into()))?
        .to_string();
    let contact = obj
        .get("contact")
        .and_then(|v| v.as_str())
        .map(String::from);
    Ok(Publisher { name, url, contact })
}

pub(super) fn parse_status(s: &str) -> Option<RegistryEntryStatus> {
    match s {
        "draft" => Some(RegistryEntryStatus::Draft),
        "stable" | "active" => Some(RegistryEntryStatus::Active),
        "deprecated" => Some(RegistryEntryStatus::Deprecated),
        "retired" => Some(RegistryEntryStatus::Retired),
        _ => None,
    }
}

pub(super) fn parse_category(s: &str) -> Option<ExtensionCategory> {
    match s {
        "dataType" => Some(ExtensionCategory::DataType),
        "function" => Some(ExtensionCategory::Function),
        "constraint" => Some(ExtensionCategory::Constraint),
        "property" => Some(ExtensionCategory::Property),
        "namespace" => Some(ExtensionCategory::Namespace),
        _ => None,
    }
}

fn parse_parameter(val: &Value) -> Option<Parameter> {
    let obj = val.as_object()?;
    Some(Parameter {
        name: obj.get("name")?.as_str()?.to_string(),
        param_type: obj.get("type")?.as_str()?.to_string(),
        description: obj
            .get("description")
            .and_then(|v| v.as_str())
            .map(String::from),
    })
}

pub(super) fn parse_entry(val: &Value, index: usize) -> Result<RegistryEntry, RegistryError> {
    let obj = val
        .as_object()
        .ok_or_else(|| RegistryError::InvalidEntry(index, "entry must be an object".into()))?;

    let name = obj
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| RegistryError::InvalidEntry(index, "missing name".into()))?
        .to_string();

    let category_str = obj
        .get("category")
        .and_then(|v| v.as_str())
        .ok_or_else(|| RegistryError::InvalidEntry(index, "missing category".into()))?;
    let category = parse_category(category_str).ok_or_else(|| {
        RegistryError::InvalidEntry(index, format!("unknown category: {category_str}"))
    })?;

    let version = obj
        .get("version")
        .and_then(|v| v.as_str())
        .ok_or_else(|| RegistryError::InvalidEntry(index, "missing version".into()))?
        .to_string();

    let status_str = obj
        .get("status")
        .and_then(|v| v.as_str())
        .ok_or_else(|| RegistryError::InvalidEntry(index, "missing status".into()))?;
    let status = parse_status(status_str).ok_or_else(|| {
        RegistryError::InvalidEntry(index, format!("unknown status: {status_str}"))
    })?;

    let description = obj
        .get("description")
        .and_then(|v| v.as_str())
        .ok_or_else(|| RegistryError::InvalidEntry(index, "missing description".into()))?
        .to_string();

    let deprecation_notice = obj
        .get("deprecationNotice")
        .and_then(|v| v.as_str())
        .map(String::from);

    let base_type = obj
        .get("baseType")
        .and_then(|v| v.as_str())
        .map(String::from);

    let parameters = obj.get("parameters").and_then(|v| {
        v.as_array()
            .map(|arr| arr.iter().filter_map(parse_parameter).collect())
    });

    let returns = obj
        .get("returns")
        .and_then(|v| v.as_str())
        .map(String::from);

    Ok(RegistryEntry {
        name,
        category,
        version,
        status,
        description,
        deprecation_notice,
        base_type,
        parameters,
        returns,
    })
}
