//! PDF-specific configuration — paper size, margins, typography, field geometry.

use serde::{Deserialize, Serialize};

fn default_paper_width() -> f32 {
    612.0
}
fn default_paper_height() -> f32 {
    792.0
}
fn default_margin() -> f32 {
    72.0
}
fn default_header_height() -> f32 {
    36.0
}
fn default_footer_height() -> f32 {
    24.0
}
fn default_font_size() -> f32 {
    10.0
}

/// PDF rendering options from theme x-pdf extensions and user config.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfOptions {
    #[serde(default = "default_paper_width")]
    pub paper_width: f32,
    #[serde(default = "default_paper_height")]
    pub paper_height: f32,
    #[serde(default = "default_margin")]
    pub margin_top: f32,
    #[serde(default = "default_margin")]
    pub margin_bottom: f32,
    #[serde(default = "default_margin")]
    pub margin_left: f32,
    #[serde(default = "default_margin")]
    pub margin_right: f32,
    #[serde(default = "default_header_height")]
    pub header_height: f32,
    #[serde(default = "default_footer_height")]
    pub footer_height: f32,
    #[serde(default = "default_font_size")]
    pub font_size: f32,
    pub header_text: Option<String>,
    pub footer_text: Option<String>,
    /// BCP-47 language tag for the PDF /Lang tag.
    pub language: Option<String>,
}

impl Default for PdfOptions {
    fn default() -> Self {
        Self {
            paper_width: default_paper_width(),
            paper_height: default_paper_height(),
            margin_top: default_margin(),
            margin_bottom: default_margin(),
            margin_left: default_margin(),
            margin_right: default_margin(),
            header_height: default_header_height(),
            footer_height: default_footer_height(),
            font_size: default_font_size(),
            header_text: None,
            footer_text: None,
            language: None,
        }
    }
}

/// Resolved PDF configuration with derived geometry and typography constants.
pub struct PdfConfig {
    // Page geometry
    pub page_width: f32,
    pub page_height: f32,
    pub margin_top: f32,
    pub margin_bottom: f32,
    pub margin_left: f32,
    pub margin_right: f32,
    pub header_height: f32,
    pub footer_height: f32,
    // Derived
    pub content_width: f32,
    pub content_height: f32,
    // Typography
    pub label_font_size: f32,
    pub field_font_size: f32,
    pub heading_font_size: f32,
    pub hint_font_size: f32,
    // Field geometry
    pub field_height: f32,
    pub textarea_height: f32,
    pub option_height: f32,
    pub field_padding: f32,
    pub group_padding: f32,
    pub column_gap: f32,
    // Content
    pub header_text: Option<String>,
    pub footer_text: Option<String>,
    pub language: String,
}

impl PdfOptions {
    /// Convert user-facing options into a resolved config with derived values.
    pub fn to_pdf_config(&self) -> PdfConfig {
        let content_width = self.paper_width - self.margin_left - self.margin_right;
        let content_height = self.paper_height
            - self.margin_top
            - self.margin_bottom
            - self.header_height
            - self.footer_height;

        PdfConfig {
            page_width: self.paper_width,
            page_height: self.paper_height,
            margin_top: self.margin_top,
            margin_bottom: self.margin_bottom,
            margin_left: self.margin_left,
            margin_right: self.margin_right,
            header_height: self.header_height,
            footer_height: self.footer_height,
            content_width,
            content_height,
            label_font_size: 9.0,
            field_font_size: self.font_size,
            heading_font_size: 14.0,
            hint_font_size: 8.0,
            field_height: 22.0,
            textarea_height: 60.0,
            option_height: 18.0,
            field_padding: 8.0,
            group_padding: 16.0,
            column_gap: 12.0,
            header_text: self.header_text.clone(),
            footer_text: self.footer_text.clone(),
            language: self.language.clone().unwrap_or_else(|| "en-US".to_string()),
        }
    }
}
