//! Default component mapping from dataType to component type.

/// Returns the default component type for a given Formspec dataType string.
pub fn get_default_component(data_type: &str) -> &'static str {
    match data_type {
        "string" | "text" => "TextInput",
        "integer" | "decimal" | "number" => "NumberInput",
        "boolean" => "Toggle",
        "date" | "dateTime" | "time" => "DatePicker",
        "uri" => "TextInput",
        "choice" => "Select",
        "multiChoice" => "CheckboxGroup",
        "attachment" => "FileUpload",
        "money" => "MoneyInput",
        _ => "TextInput",
    }
}
