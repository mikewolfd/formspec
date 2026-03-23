
# Blog Post Prompt: Formspec Ontology Layer

## For the writer

You are writing a blog post for the Formspec project announcing and explaining a new capability: the Ontology Document specification — a sidecar layer that connects form fields to concepts in external ontologies like schema.org, FHIR, and ICD-10.

The audience is **technical but not academic**. Think: senior developers, data engineers, health IT architects, government tech leads, and data scientists who build or consume forms-based data pipelines. They know JSON, APIs, and data integration pain points. They probably don't know OWL, SKOS, or formal ontology theory — and they shouldn't need to.

## Key message

**Every form is an implicit data model, but today that model dies at export time.** When you export form data to CSV or JSON, you lose the context that explains what each field means, how it relates to fields in other systems, and which terminology standard its options come from. The Formspec Ontology Document fixes this by letting you tag form fields with stable concept identifiers from existing standards — so two independently authored forms that both collect "Employer ID Number" can be mechanically recognized as collecting the same thing, even if one calls it `ein` and the other calls it `taxIdentifier`.

## What to cover

### The problem (lead with this)

- Data scientists spend enormous time on "what does this column mean?" — manually mapping fields across forms, datasets, and systems
- Form response data is structurally typed (string, date, number) but not semantically typed (is this a birth date or a reporting date? is this an EIN or a generic tax ID?)
- When you export to CSV, you lose: column types, null semantics (non-relevant vs. skipped vs. empty), calculated vs. captured distinction, option label meanings, and any cross-form alignment
- Today, cross-form data alignment is a manual, error-prone, per-project effort

### The solution (the ontology document)

- A JSON sidecar document that lives alongside a form definition
- **Concept bindings**: tag each field with a URI from an existing ontology (schema.org, FHIR, ICD-10, etc.) — "this field represents schema.org/birthDate"
- **Vocabulary bindings**: tag option sets with the terminology system they come from — "these diagnosis codes are ICD-10-CM v2024"
- **Alignments**: declare typed relationships between form fields and external system fields — "this field is an exact match for FHIR Patient.identifier"
- **JSON-LD context**: optional bridge to linked data / semantic web for those who need it

### Critical framing (get this right)

- **This is a binding document, not an ontology.** It does NOT define new concepts. It references concepts defined elsewhere (by schema.org, HL7, WHO, IRS, etc.) and says "this form field represents that concept." The analogy: schema.org is the dictionary; the ontology document is the index card that says "when I say `dob`, I mean the word `birthDate` in that dictionary."
- **OWL-integrative, not OWL-compatible.** Uses IRIs for concept identity and SKOS vocabulary for alignment types, but doesn't require triple stores, SPARQL, or formal reasoning. Data scientists get the value through pandas/polars/Arrow — not through semantic web infrastructure.
- **Sidecar pattern.** Authored and versioned independently of the form definition. Different authority (a standards body, not the form author). Different cadence (ICD-10 updates annually; the form may not change). Multiple overlays per form (FHIR overlay for clinical use, DDI overlay for research).

### The data science payoff (formspec.frame)

- A Python module that reads definition + responses + ontology document → produces properly typed DataFrames with rich column metadata
- Auto-alignment: two FormFrames from different forms can be mechanically merged on shared concept URIs
- Null semantics preserved: "non-relevant" vs. "empty" vs. "missing"
- Calculated vs. captured columns tagged
- Option labels resolvable
- Export to Parquet with metadata that survives round-trip

### Why this matters beyond formspec

- Compliance: field-level data classification, consent management, retention policies can build on the same binding layer
- Security: static data flow analysis is tractable because FEL (the expression language) is not Turing-complete — you can trace where sensitive data flows through calculated fields and mapping rules
- Interoperability: the same form can produce FHIR resources, CSV reports, and XBRL documents through the mapping spec, with the ontology layer ensuring semantic correctness across all outputs

### What makes formspec unique here

- No other form platform treats semantic metadata as a portable, declarative artifact. JotForm, FormStack, Google Forms — they all treat compliance and semantics as infrastructure features locked to their platform. Formspec makes it part of the specification.
- The definition already contains everything a data dictionary would (types, labels, descriptions, constraints, cardinality, computed derivations, controlled vocabularies). The ontology document adds the one thing it was missing: stable concept identity.

## Tone and style

- Conversational but substantive. Not academic, not marketing fluff.
- Lead with the pain point, not the solution. The reader should feel "yes, I have this problem" before you introduce the answer.
- Use concrete examples throughout — the EIN/taxIdentifier alignment story, the ICD-10 vocabulary binding, the FHIR patient mapping.
- Avoid jargon without explanation. If you use "IRI," "SKOS," or "JSON-LD," explain it in one sentence when first introduced.
- Include at least one JSON code block showing a concept binding — make it real, not abstract.
- End with a forward-looking section on what this enables (formspec.frame, compliance-as-code, cross-form data science).

## Length

1500-2500 words. Enough to be thorough, short enough to finish in one sitting.

## Source material

- `specs/ontology/ontology-spec.md` — the full specification
- `schemas/ontology.schema.json` — the JSON schema
- `thoughts/research/2026-03-23-formspec-frame-data-science-layer.md` — the data science layer design
- `thoughts/research/2026-03-23-data-ontology-exploration.md` — deep exploration of data ontology and formspec
- `thoughts/research/2026-03-23-compliance-security-ontology-synthesis.md` — cross-domain synthesis
