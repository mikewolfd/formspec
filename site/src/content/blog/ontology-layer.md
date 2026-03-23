---
title: "Every form is an implicit data model. Today, that model dies at export time."
description: "Introducing the Formspec Ontology Document — a sidecar layer that connects form fields to concepts in external ontologies like schema.org, FHIR, and ICD-10, so independently authored forms that collect the same thing can finally be mechanically recognized as doing so."
date: 2026-03-23
tags: ["specification", "ontology", "data-science", "interoperability"]
author: "Michael Deeb & Claude"
---

You know the column. It's called `ein` in one system, `taxIdentifier` in another, `employer_id_number` in the CSV export, and `tax_id` in the Salesforce integration. They all mean the same thing — an IRS Employer Identification Number. But no machine on earth can tell you that without a human mapping them by hand.

This is the data integration problem that nobody talks about at the form level. We talk about it constantly at the data warehouse level — schema mapping, entity resolution, master data management. But the data *starts* in a form. And by the time it reaches the warehouse, the context that would make alignment trivial is already gone.

## What you lose at export time

A well-authored Formspec definition already contains everything a data dictionary would: field types, labels, descriptions, constraints, cardinality, computed derivations, controlled vocabularies. When a data scientist exports that to CSV, they lose most of it:

- **Column types** — is this string a date, a currency amount, or an EIN? CSV doesn't know.
- **Null semantics** — did the user skip this question, was the field hidden because it wasn't relevant, or did they explicitly clear it? All three become the same empty cell.
- **Calculated vs. captured** — which columns are user input and which are derived? A budget total computed from line items looks identical to a manually entered number.
- **Option label meanings** — the response says `"severe"`. The analyst wants `"Severe (Grade 3)"`. The downstream system wants ICD-10 code `F32.2`.
- **Cross-form alignment** — two independently authored forms both collect an Employer ID Number. One calls it `ein`, the other calls it `taxIdentifier`. Nothing connects them.

Today, cross-form data alignment is a manual, error-prone, per-project effort. Data scientists spend enormous time on "what does this column mean?" — manually mapping fields across forms, datasets, and systems.

## The Ontology Document

The Formspec Ontology Document is a JSON sidecar that lives alongside a form definition — just like Theme, Component, and References documents already do. It adds the one thing the definition was missing: **stable concept identity**.

It does three things:

### 1. Concept bindings

Tag each field with a URI from an existing ontology. "This field represents `schema.org/birthDate`." "This field represents the IRS Employer Identification Number."

```json
{
  "$formspecOntology": "1.0",
  "version": "1.0.0",
  "targetDefinition": {
    "url": "https://example.org/forms/grant-application"
  },
  "defaultSystem": "https://schema.org",
  "concepts": {
    "ein": {
      "concept": "https://www.irs.gov/terms/employer-identification-number",
      "system": "https://www.irs.gov/terms",
      "display": "Employer Identification Number",
      "code": "EIN",
      "equivalents": [
        { "system": "https://schema.org", "code": "taxID", "type": "broader" },
        { "system": "urn:fhir:r4", "code": "Organization.identifier", "type": "exact" }
      ]
    },
    "demographics.dob": {
      "concept": "https://schema.org/birthDate",
      "display": "Date of Birth"
    }
  }
}
```

A URI — formally, an IRI (Internationalized Resource Identifier) — is a globally unique, permanent address for a concept. `https://schema.org/birthDate` means the same thing whether it appears in a Formspec form, a FHIR resource, or a Google Knowledge Graph result. When two forms both bind their date-of-birth field to `schema.org/birthDate`, a machine can recognize the match without any human intervention.

The `equivalents` array declares cross-system relationships using types borrowed from SKOS (Simple Knowledge Organization System), a W3C standard for expressing concept relationships: `exact` (same thing), `broader` (more general), `narrower` (more specific), `related`, and `close`. An EIN is an `exact` match for FHIR's `Organization.identifier` but only a `broader` match for `schema.org/taxID` — because taxID covers all tax identifiers, not just US employer ones.

### 2. Vocabulary bindings

Tag option sets with the terminology system they come from. "These diagnosis codes are ICD-10-CM version 2024."

```json
{
  "vocabularies": {
    "diagnosisCodes": {
      "system": "http://hl7.org/fhir/sid/icd-10",
      "version": "2024",
      "display": "ICD-10-CM",
      "filter": { "ancestor": "F00-F99", "maxDepth": 3 }
    }
  }
}
```

The filter narrows scope — this option set doesn't use all of ICD-10, just mental health codes three levels deep from the F00-F99 chapter. The `valueMap` property (not shown) handles the common case where your form's option values don't exactly match the terminology's codes — mapping from one to the other without changing the form itself.

### 3. Alignments

Declare typed relationships between form fields and external system fields. "This field is an exact match for FHIR `Patient.identifier`."

```json
{
  "alignments": [
    {
      "field": "mrn",
      "target": {
        "system": "urn:fhir:r4",
        "code": "Patient.identifier",
        "display": "Patient Identifier"
      },
      "type": "exact",
      "bidirectional": true
    }
  ]
}
```

Alignments differ from concept bindings in scope: a concept binding says what a field *means* (ontological identity). An alignment says how a field *maps* to a specific system (integration metadata). The same field might have one concept binding but multiple alignments — one for FHIR, one for Salesforce, one for an internal data warehouse.

## What this is not

This framing matters more than the features.

**It's a binding document, not an ontology.** The Ontology Document does NOT define new concepts. It references concepts defined elsewhere — by schema.org, HL7, WHO, the IRS, whoever owns the standard. The analogy: schema.org is the dictionary; the Ontology Document is the index card that says "when I say `dob`, I mean the word `birthDate` in that dictionary."

**OWL-integrative, not OWL-compatible.** The specification borrows two things from the semantic web: IRIs for concept identity (globally unique, permanent, resolvable) and SKOS for relationship types (exact, broader, narrower). It does NOT require triple stores, SPARQL queries, OWL reasoners, or any semantic web infrastructure. Data scientists get the value through pandas and Parquet — not through formal ontology tooling.

**Sidecar pattern.** Authored and versioned independently of the form definition. Different authority — a standards body, not the form author. Different cadence — ICD-10 updates annually; the form may not change. And composable: the same form can have a FHIR overlay for clinical use, a DDI overlay for research data, and a federal standards overlay for government reporting. Each maintained by the party who knows that domain best.

## The data science payoff

The Ontology Document is designed to power `formspec.frame` — a Python module that reads a definition, responses, and an optional ontology document to produce properly typed DataFrames with rich column metadata.

Three data sources compose with graceful degradation:

| Data source | What it provides | Required? |
|---|---|---|
| **Definition** | Field structure, types, option sets, binds, labels | Yes |
| **Registry** | Extension type enrichment (baseType, constraints, sensitive flag) | No |
| **Ontology Document** | Concept URIs, vocabulary bindings, cross-system alignments | No |

Any layer can be absent and the others still work. But when all three are present, the payoff is significant:

- **Auto-alignment**: Two FormFrames from different forms can be mechanically merged on shared concept URIs. If both forms bind their date-of-birth field to `schema.org/birthDate`, joining the datasets on that concept is one function call — no manual column matching.
- **Null semantics preserved**: "non-relevant" (field was hidden), "empty" (user cleared it), and "missing" (user skipped it) are distinct values, not all collapsed to `NaN`.
- **Calculated vs. captured** columns are tagged, so analysts can filter to only human-entered data.
- **Option labels resolvable**: The response value `"severe"` can be expanded to its full display label, or mapped to an external terminology code via the vocabulary binding.
- **Export to Parquet with metadata that survives round-trip**: Column-level concept URIs, terminology system versions, and relationship types persist through serialization and deserialization.

## Why this matters beyond data science

**Compliance.** Field-level data classification, consent management, and retention policies can build on concept bindings. If a field is bound to a concept tagged as PII in your governance framework, that classification follows the data everywhere — not just within the form platform.

**Security.** Static data flow analysis is tractable because FEL (the Formspec expression language) is not Turing-complete. You can trace exactly where sensitive data flows through calculated fields and mapping rules. Combine that with ontology bindings and you can answer "does any PII-classified field feed into a value that gets exported to a third-party system?" — mechanically, not by auditing code.

**Interoperability.** The same form can produce FHIR resources, CSV reports, and XBRL documents through Formspec's mapping specification. The ontology layer ensures semantic correctness across all outputs — the field that represents `schema.org/birthDate` gets mapped to the right element in each target format because the concept identity is declared once and referenced everywhere.

## What makes this different

No other form platform treats semantic metadata as a portable, declarative artifact. JotForm, FormStack, Google Forms, Typeform — they all treat compliance and semantics as infrastructure features locked inside their platform. If you want to know what a field means in the context of FHIR or schema.org, you need their API, their export format, their mapping tool.

Formspec makes it part of the specification. The ontology document is JSON. It's versionable, diffable, reviewable, and composable. A standards body can publish an ontology overlay for a form they didn't author. A data governance team can add classification metadata without touching the form definition. A data scientist can merge datasets from different forms based on shared concept URIs without asking anyone what the columns mean.

The definition already contained everything a data dictionary would. The ontology document adds the one thing it was missing: **stable concept identity** — the bridge from "what does this form collect?" to "what does this data mean?"
