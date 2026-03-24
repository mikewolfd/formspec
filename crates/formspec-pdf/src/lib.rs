//! Formspec PDF renderer — AcroForm fields + tagged PDF/UA structure from LayoutNode trees.

mod fonts;
mod measure;
mod paginate;
mod layout;
mod render;
mod appearance;
mod acroform;
mod tagged;
mod xfdf;
mod options;

pub use options::PdfOptions;
pub use xfdf::{generate_xfdf, parse_xfdf};

use formspec_plan::EvaluatedNode;

/// Render a PDF from an evaluated layout node tree.
pub fn render_pdf(
    evaluated_tree: &[EvaluatedNode],
    options: &PdfOptions,
) -> Vec<u8> {
    let config = options.to_pdf_config();
    let measured = measure::measure_trees(evaluated_tree, &config);
    let pages = paginate::paginate(&measured, &config);
    render::render_document(&pages, evaluated_tree, &config)
}

#[cfg(test)]
mod tests;
