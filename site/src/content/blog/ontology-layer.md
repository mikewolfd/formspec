---
title: "AI can't do your data engineering if it doesn't know what the columns mean"
description: "Formspec's new semantic layer gives form fields stable, machine-readable concept identity — the missing ingredient that turns AI data engineering from guesswork into something you can actually trust."
date: 2026-03-23
tags: ["specification", "ontology", "data-science", "interoperability", "ai"]
author: "Michael Deeb & Claude"
---

You've seen the demo. You paste a CSV into an AI tool, ask it to merge two datasets, and it figures out that `ein` in one file is probably the same as `tax_id` in the other. Impressive. But "probably" isn't good enough when you're building a data pipeline that runs unsupervised, or generating a compliance report that regulators will read, or merging patient records across two hospital systems.

The AI is guessing from column names. Sometimes it guesses right. Sometimes it confidently merges an Employer ID Number with a generic tax identifier and nobody catches it until the numbers don't add up downstream.

This is the bottleneck for AI-powered data engineering: not the AI's reasoning ability, but the absence of machine-readable context about what the data actually means.

## The context gap

When a person builds a form, they know exactly what every field represents. The person who added the EIN field knows it's an IRS Employer Identification Number — a nine-digit identifier for business entities, distinct from a Social Security Number, narrower than a generic "tax ID." The person who added the diagnosis dropdown knows it pulls from ICD-10, the international medical coding system, 2024 edition, mental health chapter. The person who made a field conditionally hidden knows exactly why some responses won't have a value there.

All of that context exists at authoring time. But it doesn't survive the journey to a spreadsheet or a database. By the time an AI agent or a data analyst sees the data, it's just rows and columns with ambiguous names. The context that would make the work trivial — or make AI automation reliable — is gone.

The human analyst compensates by reading documentation, asking the form builder, or drawing on domain expertise. The AI compensates by guessing from patterns and column names. Neither approach scales. Neither is reliable enough for production.

## What if the data carried its own meaning?

Formspec's semantic layer solves this by letting organizations define what their form fields mean in a way that both humans and machines can read.

Here's the core idea: your organization maintains a **concept dictionary** — a machine-readable file that says things like "Here's our concept called EIN. Its formal identity is this IRS identifier. It's the same thing as FHIR's Organization.identifier in our health systems. It's a more specific version of the broader 'tax ID' concept in schema.org." You define this once.

Then form authors tag their fields: "This field represents our shared EIN concept."

That single tag changes everything about what's possible downstream. The data now carries its own context — not as a label that an AI has to interpret, but as a stable identifier that any tool can resolve to a full definition with cross-system equivalences.

## What AI can do with concept identity

When form fields have stable, machine-readable concept identity, AI goes from "probably the same column" to "definitively the same concept." That's the difference between a demo and a production system.

**Automated dataset merging.** An AI agent reading two datasets doesn't have to guess that `ein` and `tax_id` might be the same field. Both resolve to the same concept URI. The merge is mechanical, not heuristic. It works the same way on the thousandth run as the first.

**Pipeline generation with guardrails.** An AI generating a data pipeline can read the concept metadata to understand not just column names but relationships between systems. It knows that EIN is an `exact` match for FHIR's Organization.identifier but only a `broader` match for schema.org's generic tax ID — and it can use that distinction to generate the right join logic instead of a naive name match.

**Compliance automation.** When your concept dictionary marks a field as containing personally identifiable information, an AI auditing your data flows doesn't have to guess which columns are sensitive. It reads the classification, traces where that concept appears across every form in the organization, and generates a compliance report that's based on declared facts, not inferred patterns.

**Self-documenting data for agents.** An AI agent that receives a dataset with concept metadata can immediately answer questions about it. "What coding system do these diagnosis codes come from?" isn't a research project — it's a metadata lookup. "Are these two datasets compatible for merging?" isn't an hour of exploratory analysis — it's a concept comparison.

**Disambiguation without hallucination.** The hardest problem in AI-powered data work isn't the common cases — it's the edge cases where column names are misleading or ambiguous. A column called `id` could be anything. A column tagged with a concept URI that resolves to "IRS Employer Identification Number" is unambiguous. The AI doesn't need to guess, so it can't guess wrong.

## How it works

There are three pieces, and you use whichever ones you need.

**A shared concept dictionary.** Your data governance team publishes a machine-readable list of concepts, each with a stable identifier, a human-readable name, and cross-system equivalences. You maintain this in one place. When ICD-10 releases a new version, you update one entry. Every form that references it picks up the change. This uses the same registry infrastructure Formspec already has for managing custom field types — no new systems to set up.

**Tags on form fields.** A form author adds one property to a field: "this field represents our shared EIN concept." That connects the field to the concept dictionary, which connects it to every other field in the organization that collects the same thing. If no dictionary is loaded, the tag still works as documentation.

**A per-form overlay for specific integrations.** Some metadata is specific to one form's context — "this form's MRN field maps to the Patient.identifier field in our FHIR system" or "this EIN field maps to the TaxId column in Salesforce." These per-form details live in a separate file alongside the form definition.

A simple form might just use tags. A large organization might have a rich concept dictionary plus per-form overlays for each integration. You add layers as you need them.

## The cost argument

Even without AI in the picture, the semantic layer pays for itself in analyst time. Industry surveys consistently put data preparation at 60-80% of a data team's work. Most of that preparation is the mapping problem — figuring out what columns mean, how datasets relate, which coding systems are in use. The semantic layer eliminates the mapping problem by making the answers part of the data.

But the real leverage is what it enables with AI. The difference between "an AI that can probably merge these datasets" and "an AI that can reliably merge these datasets" is the difference between a tool you demo and a tool you deploy. Concept identity is what makes the reliable version possible.

Your data team goes from spending their time on mapping to spending their time on questions that actually require human judgment. The mechanical work — merging, classifying, tracing, documenting — becomes something you can automate with confidence, because the AI isn't guessing. It's reading a spec.

## Why this hasn't existed before

Every other form platform treats field semantics as a platform feature locked behind their API. Want to know what a Google Forms field means in the context of a health data standard? You can't. Want to merge responses from two Typeform surveys? Manual process. Want an AI agent to reliably classify fields across your JotForm account? Good luck — there's no machine-readable concept layer to read.

Formspec makes this a portable, open part of the specification. Your concept dictionary is a file you own. You can version it, review it, hand it to an AI agent, or publish it for partners to adopt. A standards body can publish concept definitions that any organization can use. A data governance team can add classifications without touching the forms.

The form definition already captured *what* data is collected. The semantic layer adds *what that data means* — in terms that humans can read, machines can resolve, and AI can act on. That's the recipe that makes AI data engineering real.
