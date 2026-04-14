# WOS AI Integration Reference Map

> `wos-spec/specs/ai/ai-integration.md` -- 667 lines -- Layer 2: AI Governance

## Overview

The WOS AI Integration Specification defines Layer 2: the governance of AI agents. It extends Layer 1 human governance concepts (Review Protocols -> Suppression; Reasoning Tier -> Narrative Tier).

## Section Map

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| S3 | Agent Registration | Taxonomy (deterministic/statistical/generative). | `modelIdentifier`, `capabilities` | Defining AI agent actors |
| S4 | Deontic Constraints | Permission, Prohibition, Obligation, Right. | `PE`, `PR`, `OB`, `RI` | Constraining agent behavior via FEL |
| S5 | Autonomy Levels | Autonomous, Supervisory, Assistive, Manual. | `reviewWindow`, `impact-cap` | Setting agent decision authority |
| S6 | Formspec Validator | The agent as an untrusted field extractor/user. | `outputContractRef`, `agentProvenance` | Building agent output validation cages |
| S7 | Confidence | Metrics, floors, and temporal decay. | `confidenceFloor`, `decayFactor` | Routing based on model certainty |
| S8 | Fallback Chains | Graceful degradation to humans. | `alternateAgent`, `escalateToHuman` | Handling agent failures or guardrail trips |
| S9 | Drift Detection | Structural guards against silent behavioral shift. | `driftAlert`, `rubber-stamp` | Monitoring long-term agent stability |
| S10 | Oversight | Presentation controls for AI-assisted review. | `independentFirstSupression` | Designing AI/Human review interfaces |
| S11 | Volume | Rate limits on autonomous action. | `maxAutonomousPerHour` | Preventing runaway automation |
| S12 | Disclosure | Agent identity/assistance disclosure. | `agentDisclosure` notice requirement | Implementing transparency for due process |
| S13 | Narrative Tier | Model-generated, non-authoritative reasoning. | `authoritative: false` | Adding LLM-generated explanations |
| S14 | Assist Proxy | Gouvernance for the Formspec Assist protocol. | `AssistProvider`, `AssistConsumer` | Intercepting agent tool calls |

## Key Rules

1. **The External Principle (S1.2):** Constraints are external (WOS Processor), never inside the agent.
2. **Deontic Ordering (S4.6):** Permissions -> Prohibitions -> Obligations -> Confidence Floor.
3. **Autonomy Capping (S5.3):** Autonomy is capped by `impactLevel`. `rights-impacting` defaults to `assistive`.
4. **Epistemic Labeling (S13.2):** Narrative tier content MUST be labeled "non-authoritative".
5. **Fallback Mandatory (S8.1):** Every agent invocation MUST have a terminal path to human execution.
