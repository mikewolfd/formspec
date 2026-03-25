//! PDF/UA structure tree — tagging context for marked content and struct elements.
//!
//! Tracks MCIDs (marked content identifiers) for text, OBJR (object references)
//! for widget annotations, and builds the StructTreeRoot → Document → Sect → P/Form
//! hierarchy required by PDF/UA (Matterhorn Protocol).

use pdf_writer::types::StructRole;
use pdf_writer::{Finish, Name, Pdf, Ref};

/// Information about a label's marked content region.
pub struct LabelTag {
    /// The struct element ref for this label's <P> element.
    pub struct_elem_ref: Ref,
    /// The MCID assigned to this label on its page.
    pub mcid: i32,
    /// The page index this label appears on.
    pub page_index: usize,
    /// The parent Sect element ref (for grouping).
    pub parent_ref: Ref,
}

/// Information about a field's OBJR (annotation → struct element link).
pub struct FieldTag {
    /// The struct element ref for this field's <Form> element.
    pub struct_elem_ref: Ref,
    /// The annotation ref for the widget.
    pub annot_ref: Ref,
    /// The page index this field appears on.
    pub page_index: usize,
    /// The parent Sect element ref (for grouping).
    pub parent_ref: Ref,
    /// The StructParent key assigned to this annotation.
    pub struct_parent_key: i32,
    /// Tooltip text for /TU (from label or hint). Stored for potential /Alt text on struct elements.
    #[allow(dead_code)]
    pub tooltip: String,
}

/// Tracks state for building the PDF structure tree, ParentTree, and marked content IDs.
pub struct TaggingContext {
    /// Next available Ref id.
    next_ref: i32,
    /// Next available marked content identifier (MCID), per page.
    next_mcid: i32,
    /// Per-page list of (mcid, struct_elem_ref) pairs for the ParentTree.
    page_mcid_map: Vec<Vec<(i32, Ref)>>,
    /// Next StructParent index for annotations (starts after page count).
    next_struct_parent: i32,
    /// Collected label tags for building <P> struct elements.
    pub label_tags: Vec<LabelTag>,
    /// Collected field tags for building <Form> struct elements.
    pub field_tags: Vec<FieldTag>,
    /// The current page index (0-based).
    current_page: usize,
    /// The default Sect ref to use as parent when no layout grouping is active.
    pub default_sect_ref: Ref,
}

impl TaggingContext {
    /// Create a new tagging context. `start_ref` is the first available Ref for allocation.
    pub fn new(start_ref: Ref) -> Self {
        let start = start_ref.get();
        // Allocate the default Sect ref immediately (first ref from our range)
        let default_sect = Ref::new(start);
        Self {
            next_ref: start + 1,
            next_mcid: 0,
            page_mcid_map: vec![vec![]],
            next_struct_parent: 0,
            label_tags: Vec::new(),
            field_tags: Vec::new(),
            current_page: 0,
            default_sect_ref: default_sect,
        }
    }

    /// Allocate a new PDF object reference.
    pub fn alloc_ref(&mut self) -> Ref {
        let r = Ref::new(self.next_ref);
        self.next_ref += 1;
        r
    }

    /// Get the next ref id without allocating (for planning).
    #[cfg(test)]
    pub fn peek_next_ref(&self) -> i32 {
        self.next_ref
    }

    /// Allocate the next marked content ID for the current page.
    pub fn next_mcid(&mut self) -> i32 {
        let mcid = self.next_mcid;
        self.next_mcid += 1;
        mcid
    }

    /// Begin tracking a new page. Resets the MCID counter for the page.
    pub fn new_page(&mut self) {
        self.current_page += 1;
        self.page_mcid_map.push(vec![]);
        self.next_mcid = 0;
    }

    /// Get the current page index.
    #[cfg(test)]
    pub fn current_page(&self) -> usize {
        self.current_page
    }

    /// Register an MCID on the current page as belonging to a structure element.
    pub fn register_mcid(&mut self, mcid: i32, struct_elem: Ref) {
        if let Some(page) = self.page_mcid_map.last_mut() {
            page.push((mcid, struct_elem));
        }
    }

    /// Allocate the next StructParent index (for annotation StructParent key).
    pub fn alloc_struct_parent(&mut self) -> i32 {
        let sp = self.next_struct_parent;
        self.next_struct_parent += 1;
        sp
    }

    /// Tag a label: allocate a <P> struct element, assign an MCID, register it.
    /// Returns the MCID to use in the content stream's BDC operator.
    pub fn tag_label(&mut self, parent_sect: Ref) -> i32 {
        let mcid = self.next_mcid();
        let struct_ref = self.alloc_ref();
        self.register_mcid(mcid, struct_ref);
        self.label_tags.push(LabelTag {
            struct_elem_ref: struct_ref,
            mcid,
            page_index: self.current_page,
            parent_ref: parent_sect,
        });
        mcid
    }

    /// Tag a field annotation: allocate a <Form> struct element, assign a StructParent key.
    /// Returns the StructParent key to set on the annotation.
    pub fn tag_field(&mut self, annot_ref: Ref, parent_sect: Ref, tooltip: &str) -> i32 {
        let struct_ref = self.alloc_ref();
        let sp_key = self.alloc_struct_parent();
        self.field_tags.push(FieldTag {
            struct_elem_ref: struct_ref,
            annot_ref,
            page_index: self.current_page,
            parent_ref: parent_sect,
            struct_parent_key: sp_key,
            tooltip: tooltip.to_string(),
        });
        sp_key
    }

    /// Get all page MCID maps (for building the ParentTree).
    pub fn page_mcid_maps(&self) -> &[Vec<(i32, Ref)>] {
        &self.page_mcid_map
    }

    /// Total number of pages tracked.
    #[cfg(test)]
    pub fn page_count(&self) -> usize {
        self.page_mcid_map.len()
    }

    /// Write the complete structure tree into the PDF.
    ///
    /// This writes:
    /// - StructTreeRoot on the catalog (via the returned ref)
    /// - Document element as the root's single child
    /// - Sect element(s) grouping labels and fields
    /// - P elements for labels (with MCR children)
    /// - Form elements for fields (with OBJR children)
    /// - ParentTree (NumberTree) mapping page keys and annotation keys to struct elements
    pub fn write_structure_tree(&self, pdf: &mut Pdf, page_refs: &[Ref], page_count: usize) -> Ref {
        // Allocate refs for the tree root and document element
        let tree_root_ref = Ref::new(self.next_ref);
        let doc_elem_ref = Ref::new(self.next_ref + 1);
        // We need more refs for indirect arrays in the parent tree
        let mut extra_ref = self.next_ref + 2;

        // Write P struct elements (labels)
        for tag in &self.label_tags {
            let page_ref = page_refs[tag.page_index.min(page_refs.len() - 1)];
            let mut elem = pdf.struct_element(tag.struct_elem_ref);
            elem.kind(StructRole::P);
            elem.parent(tag.parent_ref);
            elem.page(page_ref);
            elem.marked_content_child()
                .page(page_ref)
                .marked_content_id(tag.mcid);
            elem.finish();
        }

        // Write Form struct elements (fields)
        for tag in &self.field_tags {
            let page_ref = page_refs[tag.page_index.min(page_refs.len() - 1)];
            let mut elem = pdf.struct_element(tag.struct_elem_ref);
            elem.kind(StructRole::Form);
            elem.parent(tag.parent_ref);
            elem.page(page_ref);
            elem.object_child().page(page_ref).object(tag.annot_ref);
            elem.finish();
        }

        // Write Sect element — groups all labels and fields
        {
            let mut sect = pdf.struct_element(self.default_sect_ref);
            sect.kind(StructRole::Sect);
            sect.parent(doc_elem_ref);
            let mut children = sect.children();
            for tag in &self.label_tags {
                children.struct_element(tag.struct_elem_ref);
            }
            for tag in &self.field_tags {
                children.struct_element(tag.struct_elem_ref);
            }
            children.finish();
            sect.finish();
        }

        // Write Document element
        {
            let mut doc = pdf.struct_element(doc_elem_ref);
            doc.kind(StructRole::Document);
            doc.parent(tree_root_ref);
            doc.child(self.default_sect_ref);
            doc.finish();
        }

        // Write ParentTree as a NumberTree
        // Keys 0..page_count-1 → per-page arrays of struct element refs (indexed by MCID)
        // Keys page_count..page_count+annot_count-1 → direct struct element refs for annotations
        {
            // Write indirect arrays for each page's MCID→struct_elem mapping
            let page_array_refs: Vec<Ref> = (0..page_count)
                .map(|_| {
                    let r = Ref::new(extra_ref);
                    extra_ref += 1;
                    r
                })
                .collect();

            for (page_idx, page_array_ref) in page_array_refs.iter().enumerate() {
                let mcid_map = if page_idx < self.page_mcid_map.len() {
                    &self.page_mcid_map[page_idx]
                } else {
                    // Empty page — write an empty array
                    &[][..]
                };

                // Build a dense array: index = MCID, value = struct_elem_ref
                // MCIDs are sequential per page starting at 0
                let max_mcid = mcid_map.iter().map(|(m, _)| *m).max().unwrap_or(-1);
                let mut arr = pdf.indirect(*page_array_ref).array();
                for mcid in 0..=max_mcid {
                    if let Some((_, struct_ref)) = mcid_map.iter().find(|(m, _)| *m == mcid) {
                        arr.item(*struct_ref);
                    } else {
                        arr.push().primitive(pdf_writer::Null);
                    }
                }
                arr.finish();
            }

            // Write the StructTreeRoot as a raw dict (not via struct_element, which adds /Type /StructElem)
            let total_keys = page_count as i32 + self.field_tags.len() as i32;
            let mut dict = pdf.indirect(tree_root_ref).dict();
            dict.pair(Name(b"Type"), Name(b"StructTreeRoot"));
            dict.pair(Name(b"K"), doc_elem_ref);
            dict.pair(Name(b"ParentTreeNextKey"), total_keys);

            // Inline the ParentTree
            let mut pt = dict.insert(Name(b"ParentTree")).dict();
            let mut nums = pt.insert(Name(b"Nums")).array();

            // Page entries: key → indirect array ref
            for (page_idx, page_array_ref) in page_array_refs.iter().enumerate() {
                nums.item(page_idx as i32);
                nums.item(*page_array_ref);
            }

            // Annotation entries: key → direct struct element ref
            for tag in &self.field_tags {
                let key = page_count as i32 + tag.struct_parent_key;
                nums.item(key);
                nums.item(tag.struct_elem_ref);
            }

            nums.finish();
            pt.finish();
            dict.finish();
        }

        tree_root_ref
    }
}
