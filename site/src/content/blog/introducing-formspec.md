---
title: "Introducing Formspec: A JSON-native form specification for high-stakes environments"
description: "Why we built a new form specification, what it solves, and how it fits into the ecosystem of tools for grants, field operations, and compliance workflows."
date: 2026-01-15
tags: ["announcement", "specification"]
author: "Formspec Team"
---

Forms are everywhere. But most form systems were designed for simple cases — contact pages, surveys, newsletter signups. When you're building forms for a grant application process, a field inspection workflow, or a compliance reporting system, you hit walls quickly.

We built Formspec to address that gap.

## The problem with existing form tools

Most form builders and form libraries fall into one of two categories:

**GUI tools** (Typeform, Google Forms, Jotform) are easy to use but treat forms as a product, not a specification. Your form definitions live inside a platform. You can't version-control them, lint them, or run them offline. When the vendor pivots or raises prices, you're stuck.

**Code-first libraries** (React Hook Form, Formik, XState-based solutions) give you control, but they're framework-specific and don't define a portable data format. The validation logic lives in JavaScript, not in a definition that can be re-run server-side in Python, or validated before deployment.

Neither approach is designed for the constraints of high-stakes data collection:
- Forms that must work offline, in the field, on a plane
- Rules that must be validated identically on the client *and* server
- Definitions that can be statically linted before they're deployed to users
- Data that needs to flow into multiple downstream systems without re-entry

## What Formspec is

Formspec is a **JSON-native form specification**. A form definition is a structured JSON document — validated by JSON Schema, lintable by the static analyzer, runnable by two reference implementations (TypeScript and Python).

Here's a minimal example:

```json
{
  "title": "Grant Application",
  "items": [
    {
      "id": "org_name",
      "type": "string",
      "label": "Organization name",
      "bind": { "required": "true" }
    },
    {
      "id": "org_type",
      "type": "choice",
      "label": "Organization type",
      "choices": [
        { "value": "nonprofit", "label": "Nonprofit (501c3)" },
        { "value": "government", "label": "Government agency" }
      ]
    },
    {
      "id": "ein",
      "type": "string",
      "label": "EIN",
      "bind": {
        "relevant": "$org_type = 'nonprofit'",
        "required": "true"
      }
    }
  ]
}
```

A few things to notice:

- The `bind.relevant` expression uses **FEL** (Formspec Expression Language) — a deterministic, side-effect-free language for computed values and conditions
- The EIN field is conditionally required: it's only relevant when the org type is nonprofit, and only then required
- This same definition can be loaded into the TypeScript engine (browser) or the Python evaluator (server) — the same rules run in both environments

## What Formspec is not

Formspec is the form engine — data, logic, validation, rendering. It is not:
- A hosting platform
- An auth system
- A workflow engine
- A database

Your stack handles those. Formspec handles the form.

## Three tiers

The specification is organized into three tiers:

**Core** — The data and logic layer: field types, binds (required, relevant, readonly, calculate), FEL expressions, repeatable groups, validation reports.

**Theme** — The presentation layer: visual tokens, widget catalog, page layout, responsive design. Separated cleanly so you can change how a form looks without touching what it validates.

**Components** — The interaction layer: 33 built-in components (TextInput, Select, DatePicker, etc.), slot binding, custom components, responsive configuration.

## Status

The specification is under active development. The TypeScript engine and Python evaluator both pass the conformance suite. The web component (`<formspec-render>`) is functional and supports the full component catalog.

What's not built yet: a production-ready UI builder, hosted examples, and the documentation site. Those are coming. The core is solid.

We're publishing the specification and reference implementations openly so teams can evaluate the approach, contribute, and build on it.

If you're working on a high-stakes form problem — grants, inspections, compliance, intake — we'd like to hear from you.
