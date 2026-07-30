# Issue and PR Guide

Purpose: templates, labels, and how things get triaged.
Last updated: 2026-07-30

## Labels

### Type

| Label | Meaning |
|---|---|
| `bug` | Something is broken |
| `feature` | A new capability |
| `enhancement` | An existing feature made better |
| `docs` | Documentation |
| `chore` | Tooling, dependencies |
| `question` | Needs clarification before it can be actioned |

### Priority

| Label | Meaning | Response |
|---|---|---|
| `p0-critical` | The app is unusable, data loss, or a security issue | Immediately |
| `p1-high` | A core feature is broken for many users | Within days |
| `p2-normal` | Everything else | When possible |
| `p3-low` | Nice to have | Maybe never, honestly |

An **accessibility failure is a `bug`, not an `enhancement`**, and is prioritised as such. The same applies to an ungrounded generated item: a question shown without a valid citation is a `p1-high` bug, because it breaks the product's core promise.

### Area

`area:parsing`, `area:quiz`, `area:flashcards`, `area:review`, `area:exam`, `area:chat`, `area:dashboard`, `area:ai`, `area:storage`, `area:pwa`, `area:copy`, `area:a11y`, `area:mobile`

### Other

| Label | Meaning |
|---|---|
| `good-first-issue` | Small, self-contained, genuinely approachable |
| `help-wanted` | Maintainer is not going to get to it |
| `needs-repro` | Cannot be actioned without reproduction steps |
| `needs-document` | A parsing bug where we need the file that broke |
| `wont-fix` | Declined, with a reason |
| `out-of-scope` | Conflicts with [NON-GOALS-AND-SCOPE.md](../01-PRODUCT/NON-GOALS-AND-SCOPE.md) |
| `blocked` | Waiting on something external |

## Issue templates

### Bug report

```markdown
**What happened**


**What you expected**


**Steps to reproduce**
1.
2.
3.

**Device and browser**
- Device:
- OS:
- Browser and version:
- Screen size, if it is a layout issue:

**The document, if parsing was involved**
Attach it if you can. If not, tell us:
- Format:
- Roughly how many pages:
- Where it came from (exported from what tool?):
- Is it a scan?

**Screenshot**
```

The document questions are the important part. Parsing bugs are our most common bug class and they are almost impossible to fix without the file or a good description of how it was made.

### Feature request

```markdown
**The problem you are trying to solve**
Describe the problem, not the solution.

**How you handle it today**


**Does it satisfy the five constraints?**
- [ ] Costs nothing to run
- [ ] Works on a mid-range phone
- [ ] Works without an account
- [ ] Any generated content would cite its source
- [ ] Serves a student studying alone
```

Asking for the problem rather than the solution is deliberate. A request stated as a problem can often be solved more simply than the requester expected.

### Parsing failure

```markdown
**The file**
Attach it, or describe it.

**Format**


**Where it came from**
Which tool exported it?

**What went wrong**
- [ ] Refused to upload
- [ ] Uploaded but no text found
- [ ] Text is garbled or out of order
- [ ] Text is there but the topics are wrong
- [ ] Page numbers in citations are wrong
- [ ] Something else

**Best outcome**
Adding this file to tests/fixtures/ with a test. Are you able to?
```

Wrong page numbers in citations get their own checkbox because they are the most damaging parsing failure. An off-by-one citation makes every generated item look untrustworthy.

### Accessibility issue

```markdown
**What is inaccessible**


**How you encountered it**
- [ ] Keyboard only
- [ ] Screen reader (which one?)
- [ ] Zoom or text scaling (what level?)
- [ ] Colour vision
- [ ] Motor or touch
- [ ] Reduced motion

**WCAG criterion, if you know it**


**What should happen instead**
```

## Pull request template

```markdown
**What this changes**


**Why**


**Requirement id**
e.g. B1, from PRODUCT-REQUIREMENTS.md

**How I verified it**


**Screenshots** (interface changes)
360px:
1280px:

**Checklist**
- [ ] Layer boundaries respected
- [ ] User-facing strings are in src/copy/
- [ ] Keyboard operable, focus visible
- [ ] Works at 320px with no horizontal scroll
- [ ] Touch targets at least 44px
- [ ] Tests added
- [ ] typecheck, lint, and tests pass

**Deliberately left out**
```

Both screenshots, because a change that looks right on desktop and breaks at 360px is the most common regression in this codebase.

The "deliberately left out" field is worth filling in. A pull request that names its own limits is faster to review than one that hides them.

## Triage

New issues get, in order: a type label, a priority, an area label, and either an action or a question.

| Situation | Action |
|---|---|
| Bug, reproducible | Label, prioritise, fix or queue |
| Bug, not reproducible | `needs-repro`, ask for detail |
| Parsing bug without the file | `needs-document`, ask for it or a description |
| Feature that fits the constraints | Label, add to [ROADMAP.md](../06-PLANNING/ROADMAP.md) if significant |
| Feature that breaks a constraint | `out-of-scope`, explain which constraint and link the ADR |
| Already decided against | `wont-fix`, link the relevant ADR |
| Small and self-contained | `good-first-issue` |
| Question | Answer, then close |

**Declining is done with a reason and a link.** "Out of scope" alone is unhelpful; "this needs accounts, which we decided against in ADR-0001, here is why" respects the person's time and lets them argue if they disagree.

Stale issues are not auto-closed. An unanswered bug report that closes itself after sixty days is a bug we simply stopped looking at.

## Response commitments

Set at a level a solo maintainer can actually honour.

| Type | Commitment |
|---|---|
| Security report | Acknowledge within 7 days |
| `p0-critical` | Same or next day |
| `p1-high` | Within a week |
| Everything else | No promise, but it will be read |

Better to state a modest commitment and keep it than a generous one and break it.

## Proposing a change to a decision

Decisions in [08-DECISIONS](../08-DECISIONS/DECISION-LOG.md) are not permanent, but they are not overturned by a pull request either.

Open an issue that covers: which ADR, what has changed since it was written, what the new evidence is, and what the consequences of reversing it would be. If the case holds, a superseding ADR gets written and the old one is marked Superseded.

This keeps the reasoning traceable. A decision quietly reversed in a diff leaves the next person with no idea why either choice was made.
