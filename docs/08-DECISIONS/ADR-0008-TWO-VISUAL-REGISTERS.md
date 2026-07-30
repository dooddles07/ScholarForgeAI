# ADR-0008: Two visual registers, one application

Status: accepted
Date: 2026-07-30

## Context

The design documents describe one product surface: a calm, unfussy study app, "a well-set book rather than a dashboard". [DESIGN-SYSTEM.md](../02-DESIGN/DESIGN-SYSTEM.md) forbids gradients on functional surfaces, decorative illustration, and any animation that does not communicate something. [UI-UX-DESIGN.md](../02-DESIGN/UI-UX-DESIGN.md) keeps a feature grid, testimonials, and a hero illustration off the landing screen because each would push the drop zone down.

That is the right design for someone already using the product. It is a weak design for someone deciding whether to trust it.

The project has a genuine explaining problem. It is free with no paid tier, it does not upload your files, and it refuses to answer from anything but your document. Those claims sound like marketing until they are demonstrated, and the existing landing screen has nowhere to demonstrate them.

## Decision

One application, two visual registers.

**The marketing route (`/`) is expressive.** Dark ground, a display serif, scroll-driven motion, and real rendered examples of the output. It exists to explain and to earn trust.

**The app routes (`/app/*`) stay calm.** The existing tokens, system fonts, one question per screen, bottom-anchored actions, readable measure. Nothing here competes with the content.

Both surfaces hold the same floor, without exception: WCAG 2.2 AA contrast, 44x44px touch targets, visible focus, full keyboard operation, `prefers-reduced-motion`, and no horizontal scroll at 320px. The register changes how it looks, never whether it works.

### The landing screen is not lost

The marketing hero contains a working drop zone, not a picture of one. Drop a file and it goes straight to `/app/parse`. The three-tap path from [USER-FLOWS.md](../01-PRODUCT/USER-FLOWS.md) survives; the narrative sits below the fold for people who need it. Returning visitors skip `/` and land on the library, which the design already required.

### The citation is promoted

DESIGN-SYSTEM.md called the citation "the trust mechanism" and then specified it at `--text-xs` in `--text-muted`. Those two statements disagree. The citation is now amber, legible, and tappable, and it is the organising idea of both surfaces: a highlighter mark on a source passage with a thread running to the thing it produced.

## Consequences

**Good.** The trust claims get somewhere to live. The app is unchanged for people using it. The citation looks like what the documents always said it was.

**Costs.** Two registers to keep coherent. One self-hosted webfont, 132 KB, on the marketing route only, which is a real exception to the system-fonts rule in [TECH-STACK.md](../03-ARCHITECTURE/TECH-STACK.md) and is why it is confined to the route that is not read on a phone at midnight. A reviewer has to know which register a change belongs to.

**Rejected alternative: keep one calm register everywhere.** Faithful to the documents, and it leaves the product unable to explain itself to a first-time visitor. The planning is public specifically so decisions can be argued with; this is one where the original call was too austere.

**Rejected alternative: make the app expressive too.** Motion and ornament in a quiz screen compete with the question. The persona is a tired student the night before an exam. Nothing in the app should ask for attention.
