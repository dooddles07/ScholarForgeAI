# ScholarForge AI — Documentation

Purpose: index of every planning document. Start here.
Last updated: 2026-07-30

ScholarForge AI turns your study material into practice. Upload a PDF, slide deck, or book, and get quizzes, flashcards, plain-language explanations, and a full practice exam. Free forever, open source, works on your phone.

## Suggested reading order

**If you are new to the project, read these four:**

1. [PROJECT-OVERVIEW.md](01-PRODUCT/PROJECT-OVERVIEW.md) — what we are building and why
2. [FEATURES-SPECIFICATION.md](01-PRODUCT/FEATURES-SPECIFICATION.md) — what it does
3. [ARCHITECTURE.md](03-ARCHITECTURE/ARCHITECTURE.md) — how it is put together
4. [BUILD-ORDER.md](06-PLANNING/BUILD-ORDER.md) — what to build first

**If you are here to write code, add these:**

5. [TECH-STACK.md](03-ARCHITECTURE/TECH-STACK.md)
6. [PROJECT-STRUCTURE.md](03-ARCHITECTURE/PROJECT-STRUCTURE.md)
7. [CODING-STANDARDS.md](05-ENGINEERING/CODING-STANDARDS.md)
8. [CONTRIBUTING.md](07-OPEN-SOURCE/CONTRIBUTING.md)

## Full document index

### 01-PRODUCT — what and for whom

| Document | Covers |
|---|---|
| [PROJECT-OVERVIEW.md](01-PRODUCT/PROJECT-OVERVIEW.md) | Vision, the problem, goals, guiding principles |
| [PRODUCT-REQUIREMENTS.md](01-PRODUCT/PRODUCT-REQUIREMENTS.md) | User stories with acceptance criteria |
| [TARGET-USERS-AND-PERSONAS.md](01-PRODUCT/TARGET-USERS-AND-PERSONAS.md) | Who this is for, in detail |
| [FEATURES-SPECIFICATION.md](01-PRODUCT/FEATURES-SPECIFICATION.md) | Every feature, fully specified |
| [USER-FLOWS.md](01-PRODUCT/USER-FLOWS.md) | Step-by-step journeys through the app |
| [NON-GOALS-AND-SCOPE.md](01-PRODUCT/NON-GOALS-AND-SCOPE.md) | What we deliberately will not build |
| [SUCCESS-METRICS.md](01-PRODUCT/SUCCESS-METRICS.md) | How we know it works |

### 02-DESIGN — how it looks and reads

| Document | Covers |
|---|---|
| [UI-UX-DESIGN.md](02-DESIGN/UI-UX-DESIGN.md) | Screen-by-screen layout intent |
| [DESIGN-SYSTEM.md](02-DESIGN/DESIGN-SYSTEM.md) | Color, type, spacing, components |
| [RESPONSIVE-AND-MOBILE.md](02-DESIGN/RESPONSIVE-AND-MOBILE.md) | Breakpoints, touch targets, thumb zones |
| [CONTENT-AND-COPY-GUIDE.md](02-DESIGN/CONTENT-AND-COPY-GUIDE.md) | Plain-language rules and exact wording |
| [ACCESSIBILITY.md](02-DESIGN/ACCESSIBILITY.md) | WCAG 2.2 AA targets and how we meet them |

### 03-ARCHITECTURE — how it is built

| Document | Covers |
|---|---|
| [ARCHITECTURE.md](03-ARCHITECTURE/ARCHITECTURE.md) | Layers, boundaries, data flow |
| [TECH-STACK.md](03-ARCHITECTURE/TECH-STACK.md) | Every dependency, why, license, cost |
| [PROJECT-STRUCTURE.md](03-ARCHITECTURE/PROJECT-STRUCTURE.md) | Folder layout and file-size discipline |
| [DATA-MODEL.md](03-ARCHITECTURE/DATA-MODEL.md) | Database schema and TypeScript types |
| [DOCUMENT-PROCESSING.md](03-ARCHITECTURE/DOCUMENT-PROCESSING.md) | How uploads become usable text |
| [AI-INTEGRATION.md](03-ARCHITECTURE/AI-INTEGRATION.md) | Proxy design, structured output, retries |
| [PROMPT-LIBRARY.md](03-ARCHITECTURE/PROMPT-LIBRARY.md) | The exact prompts and response schemas |
| [API-CONTRACTS.md](03-ARCHITECTURE/API-CONTRACTS.md) | Endpoint shapes and error codes |
| [OFFLINE-AND-PWA.md](03-ARCHITECTURE/OFFLINE-AND-PWA.md) | Service worker, caching, install |

### 04-OPERATIONS — running it for free

| Document | Covers |
|---|---|
| [ZERO-COST-INFRASTRUCTURE.md](04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md) | Every service, its free limit, what breaks at the cap |
| [DEPLOYMENT.md](04-OPERATIONS/DEPLOYMENT.md) | Vercel setup, secrets, CI |
| [SECURITY-AND-PRIVACY.md](04-OPERATIONS/SECURITY-AND-PRIVACY.md) | Key protection, no-PII stance, threat model |
| [RATE-LIMITING-AND-ABUSE.md](04-OPERATIONS/RATE-LIMITING-AND-ABUSE.md) | Quota enforcement and graceful degradation |
| [MONITORING-AND-LIMITS.md](04-OPERATIONS/MONITORING-AND-LIMITS.md) | Quota visibility and the kill switch |

### 05-ENGINEERING — how we work

| Document | Covers |
|---|---|
| [CODING-STANDARDS.md](05-ENGINEERING/CODING-STANDARDS.md) | TypeScript conventions and comment policy |
| [TESTING-STRATEGY.md](05-ENGINEERING/TESTING-STRATEGY.md) | What we test and with what |
| [GIT-WORKFLOW.md](05-ENGINEERING/GIT-WORKFLOW.md) | Branches, commits, releases |
| [DEFINITION-OF-DONE.md](05-ENGINEERING/DEFINITION-OF-DONE.md) | The merge checklist |

### 06-PLANNING — the path forward

| Document | Covers |
|---|---|
| [ROADMAP.md](06-PLANNING/ROADMAP.md) | v0.1 through v2.0 |
| [MILESTONE-PLAN.md](06-PLANNING/MILESTONE-PLAN.md) | Milestones with exit criteria |
| [BUILD-ORDER.md](06-PLANNING/BUILD-ORDER.md) | The concrete task sequence |
| [RISKS-AND-MITIGATIONS.md](06-PLANNING/RISKS-AND-MITIGATIONS.md) | What could go wrong and the plan for it |
| [OPEN-QUESTIONS.md](06-PLANNING/OPEN-QUESTIONS.md) | Still undecided |

### 07-OPEN-SOURCE — for contributors

| Document | Covers |
|---|---|
| [CONTRIBUTING.md](07-OPEN-SOURCE/CONTRIBUTING.md) | Setup and how to help |
| [CODE-OF-CONDUCT.md](07-OPEN-SOURCE/CODE-OF-CONDUCT.md) | Community standards |
| [ISSUE-AND-PR-GUIDE.md](07-OPEN-SOURCE/ISSUE-AND-PR-GUIDE.md) | Templates, labels, triage |
| [SELF-HOSTING-GUIDE.md](07-OPEN-SOURCE/SELF-HOSTING-GUIDE.md) | Run your own copy |

### 08-DECISIONS — why we chose what we chose

[DECISION-LOG.md](08-DECISIONS/DECISION-LOG.md) indexes all architecture decision records (ADRs).

### 09-SPECS — the consolidated design

[2026-07-30-SCHOLARFORGE-AI-DESIGN.md](09-SPECS/2026-07-30-SCHOLARFORGE-AI-DESIGN.md) — the single design document that came out of the planning session.

## Working notes

[ACTIVITY-LOG.md](ACTIVITY-LOG.md) — running log of what has been done and decided.

## Ground rules for these documents

- Every doc states its purpose in one line and carries a last-updated date.
- Cost claims must name the service, the specific limit, and what degrades when that limit is hit. "It's free" on its own is not acceptable.
- Where public sources disagree on a free-tier number, we state the range and link to the official page instead of inventing precision.
- Documents are scannable: headings, tables, short bullets.
