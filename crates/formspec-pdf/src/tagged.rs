//! PDF/UA structure tree — tagging context for marked content and struct elements.

use pdf_writer::Ref;

/// Tracks state for building the PDF structure tree, ParentTree, and marked content IDs.
pub struct TaggingContext {
    /// Next available Ref id.
    next_ref: i32,
    /// Next available marked content identifier (MCID).
    next_mcid: i32,
    /// Per-page list of (mcid, struct_elem_ref) pairs for the ParentTree.
    page_mcid_map: Vec<Vec<(i32, Ref)>>,
    /// List of (annotation_ref, struct_elem_ref) pairs for OBJR entries.
    annotation_struct_map: Vec<(Ref, Ref)>,
    /// Next StructParent index for annotations.
    next_struct_parent: i32,
}

impl TaggingContext {
    /// Create a new tagging context. `start_ref` is the first available Ref for allocation.
    pub fn new(start_ref: Ref) -> Self {
        Self {
            next_ref: start_ref.get(),
            next_mcid: 0,
            page_mcid_map: vec![vec![]],
            annotation_struct_map: Vec::new(),
            next_struct_parent: 0,
        }
    }

    /// Allocate a new PDF object reference.
    pub fn alloc_ref(&mut self) -> Ref {
        let r = Ref::new(self.next_ref);
        self.next_ref += 1;
        r
    }

    /// Get the next ref id without allocating (for planning).
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
        self.page_mcid_map.push(vec![]);
        self.next_mcid = 0;
    }

    /// Register an MCID on the current page as belonging to a structure element.
    pub fn register_mcid(&mut self, mcid: i32, struct_elem: Ref) {
        if let Some(page) = self.page_mcid_map.last_mut() {
            page.push((mcid, struct_elem));
        }
    }

    /// Register an annotation as belonging to a structure element.
    pub fn register_annotation(&mut self, annot: Ref, struct_elem: Ref) {
        self.annotation_struct_map.push((annot, struct_elem));
    }

    /// Allocate the next StructParent index (for annotation StructParentKey).
    pub fn alloc_struct_parent(&mut self) -> i32 {
        let sp = self.next_struct_parent;
        self.next_struct_parent += 1;
        sp
    }

    /// Get all page MCID maps (for building the ParentTree).
    pub fn page_mcid_maps(&self) -> &[Vec<(i32, Ref)>] {
        &self.page_mcid_map
    }

    /// Get all annotation-to-struct mappings.
    pub fn annotation_struct_maps(&self) -> &[(Ref, Ref)] {
        &self.annotation_struct_map
    }
}
