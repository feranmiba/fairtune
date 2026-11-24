# FairTune — Agent Architecture, Design Skills & Execution Workflow

This document establishes the official instructions, design skills, and workflows for agents working on **FairTune** — an AI-powered music copyright, contract intelligence, and Stellar royalty protection platform.

---

## 1. Skill Registry & Locations

The following three design and writing skills are preserved as separate, reusable skill packages within the repository. Agents must consult these actual files rather than inventing generic guidelines:

| Skill                      | Primary Location                                                                                                                                                                               | Purpose                                                                                                                      |
| :------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| **`frontend-design`**      | [`.agents/skills/frontend-design/SKILL.md`](.agents/skills/frontend-design/SKILL.md)                                                                                                           | Intentional visual design, art direction, bespoke typography, layout tokens, and distinctive UI for music rights management. |
| **`avoid-ai-writing`**     | [`agents/skills/avoid-ai-writing/SKILLS.md`](agents/skills/avoid-ai-writing/SKILLS.md) (also linked at [`.agents/skills/avoid-ai-writing/SKILL.md`](.agents/skills/avoid-ai-writing/SKILL.md)) | Natural, active-voice, human interface copy; elimination of AI jargon, empty superlatives, and robotic phrasing.             |
| **`audit-ai-design-slop`** | [`.agents/skills/audit-ai-design-slop/SKILL.md`](.agents/skills/audit-ai-design-slop/SKILL.md)                                                                                                 | Diagnostic, removal-first audits; elimination of decorative stacking, repetitive card containers, and generic SaaS clichés.  |

---

## 2. Skill Responsibilities & Triggers

### A. Frontend Design (`frontend-design`)

Consult and follow `frontend-design` when:

- Designing new pages, views, and dashboards.
- Building application layouts and defining visual hierarchy.
- Implementing UI components and design tokens.
- Designing responsive layouts across desktop, tablet, and mobile.
- Creating meaningful, purposeful interactions and state transitions.
- Establishing color palettes, typography scales, spacing, and structural borders tailored to music artists and collaborators.

### B. Writing and Product Language (`avoid-ai-writing`)

Consult and follow `avoid-ai-writing` when:

- Writing interface copy, page headlines, subheadings, and section intros.
- Writing button labels, action text, and call-to-action (CTA) copy.
- Designing onboarding flows and guidance steps.
- Creating empty states, validation messages, error descriptions, and system notifications.
- Writing tooltips, helper text, and user-facing explanations of contract clauses or blockchain states.
- Ensuring language is direct, active-voice, honest, and free from AI boilerplate (e.g., "seamless", "delve", "testament", "power of", "unlock").

### C. Design Quality Audit (`audit-ai-design-slop`)

Consult and follow `audit-ai-design-slop` when:

- Reviewing completed pages and views before marking them complete.
- Auditing visual consistency, typography scales, contrast, and layout rhythm.
- Identifying generic AI-generated design patterns (e.g., card-within-card syndrome, gratuitous gradient badges, non-standard icons on every paragraph).
- Reviewing component quality, edge cases, responsive clipping, and overflow.
- Refining and pruning unnecessary decorative layers using the **Removal Test** (subtraction before restyling).

---

## 3. Four-Step Feature Development Lifecycle

For every significant frontend feature, page, or component, agents must strictly follow this sequential workflow:

```
┌────────────────────────────────────────────────────────┐
│ 1. Consult `frontend-design` before implementation     │
│    - Define subject-grounded tokens & layout plan      │
│    - Choose intentional typography & purposeful visual │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 2. Consult `avoid-ai-writing` when creating UI copy    │
│    - Use active voice, plain English, artist context   │
│    - Eliminate AI buzzwords & boilerplate fluff        │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 3. Implement & Test with Real Backend Endpoints        │
│    - TypeScript strict types, semantic HTML, A11y      │
│    - Ground all data; never fake charts or payments    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 4. Audit with `audit-ai-design-slop` & Refine          │
│    - Apply Removal Test: strip non-essential chrome    │
│    - Verify responsive behavior & keyboard navigation  │
└────────────────────────────────────────────────────────┘
```

---

## 4. Architectural Rules & Design Principles

Agents must adhere to the following strict principles across all design and development work:

1. **Project Architecture Precedence:**
   - Existing monorepo architecture (`apps/api`, `apps/web`, `packages/shared`, `packages/validation`, `packages/config`) always takes precedence over generic library suggestions or boilerplate starters.
2. **Reuse Existing Design Tokens & Components:**
   - Do not create one-off styling hacks or disconnected ad-hoc style classes.
   - Build and reuse core primitive components (`Button`, `Input`, `Dialog`, `Table`, `Badge`, `Alert`, etc.) rooted in a centralized design system.
3. **No Unnecessary Dependencies:**
   - Do not install heavy component frameworks or bloated UI bundles when lightweight, tailored implementations with standard CSS/Tailwind and Radix/headless primitives achieve better results.
4. **Distinctive FairTune Brand Identity:**
   - FairTune is built for **independent musicians, producers, and collaborators**. It is neither a sterile corporate banking portal nor a generic AI crypto-hype template.
   - Core premise: _“Understand what you're signing. Know what you own. Get what you're owed.”_
   - Avoid generic AI aesthetic tells:
     - No neon gradient borders around every container.
     - No arbitrary glow or floating decorative background shapes.
     - No card-within-a-card-within-a-card stacking.
     - No ungrounded vanity statistics or fake testimonials.
5. **Truth in Data & Non-Custodial Integrity:**
   - Clearly distinguish **Confirmed On-Chain Payments**, **Pending Transactions**, and **Mathematical Projections/Simulations**.
   - Never fabricate historical earnings or render fake placeholder charts that pretend to show actual revenue.
   - The frontend must never handle, ask for, or store user private keys or secret recovery phrases. All blockchain transactions must be client-signed via Freighter / Stellar wallet extensions.
6. **Accessibility & Usability First:**
   - Never sacrifice readability, contrast, keyboard accessibility, or responsive mobile usability for aesthetic novelty.
   - Support standard WCAG AA contrast standards.
