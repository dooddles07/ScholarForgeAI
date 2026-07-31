# Definition of Done

Purpose: the checklists. Nothing merges or releases without passing these.
Last updated: 2026-07-30

## Per pull request

### Correctness

- [ ] Does what the issue asked, no more and no less
- [ ] The acceptance criteria in [PRODUCT-REQUIREMENTS.md](../01-PRODUCT/PRODUCT-REQUIREMENTS.md) are met
- [ ] Edge cases handled: empty, one item, many items, failure
- [ ] No regression in an existing feature

### Architecture

- [ ] Layer boundaries respected; nothing in `ui/` imports parsing, persistence, or the AI client directly
- [ ] `domain/` code stays pure, with no I/O
- [ ] Nothing in `functions/` uses a Node built-in
- [ ] File sizes within the guidance in [PROJECT-STRUCTURE.md](../03-ARCHITECTURE/PROJECT-STRUCTURE.md)
- [ ] No new dependency without justification against the rules in [TECH-STACK.md](../03-ARCHITECTURE/TECH-STACK.md)

### Copy

- [ ] Every user-facing string lives in `src/copy/`
- [ ] Wording follows [CONTENT-AND-COPY-GUIDE.md](../02-DESIGN/CONTENT-AND-COPY-GUIDE.md)
- [ ] Errors say what happened **and** what to do next
- [ ] No internals shown: no codes, no stack traces, no library messages
- [ ] No payment or upgrade language anywhere

### Accessibility

- [ ] Fully operable by keyboard
- [ ] Focus visible on every interactive element
- [ ] Icon-only buttons have an `aria-label`
- [ ] Inputs have real labels, not placeholder-as-label
- [ ] Colour is never the only carrier of meaning
- [ ] Contrast meets AA
- [ ] `prefers-reduced-motion` respected
- [ ] `axe-core` reports no new violation

### Responsive

- [ ] Works at 320px with no horizontal scrolling
- [ ] Checked at 360px and 1280px
- [ ] Touch targets at least 44×44px
- [ ] Primary action within thumb reach on mobile
- [ ] The on-screen keyboard does not obscure the focused input
- [ ] Safe-area insets respected where relevant

### Grounding

Applies to any change touching generated content.

- [ ] Every generated item carries a citation
- [ ] Items without a verifiable source are dropped before display
- [ ] Cited page numbers fall within the document's real range
- [ ] Partial results are reported honestly rather than silently reduced

### Privacy and security

- [ ] No API key in any committed file
- [ ] No API key in the built bundle
- [ ] No document text or user key is logged, anywhere
- [ ] No new network request sends anything beyond what the request needs
- [ ] No new cookie, no new third-party script

### Tests

- [ ] Logic changes have unit tests
- [ ] A bug fix has a test that fails before the fix
- [ ] Migrations have a test with realistic pre-migration data
- [ ] Parsing changes are checked against the fixtures
- [ ] The full suite passes

### CI

- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Build succeeds
- [ ] Initial bundle under 300 KB gzipped
- [ ] Secret scan finds nothing
- [ ] Playwright passes at both viewports
- [ ] `npm audit` clean of high and critical

### Housekeeping

- [ ] Commits are atomic and conventionally formatted
- [ ] Documentation and activity-log changes are in separate commits from code
- [ ] Screenshots attached for interface changes, at both viewports
- [ ] Affected documentation updated

## Per release

Everything above, plus:

### Manual accessibility

- [ ] A full quiz and review session completed by keyboard only
- [ ] NVDA on desktop through upload, quiz, and review
- [ ] VoiceOver on iOS through the same
- [ ] 200% zoom on every screen with no clipping
- [ ] Greyscale check: correct and incorrect still distinguishable
- [ ] Reduced motion on: nothing broken, the card flip still reads

### Real devices

Emulators do not substitute here.

- [ ] Mid-range Android: 100-page PDF parses under 10 seconds, interface never freezes
- [ ] Mid-range Android: quiz completed one-handed
- [ ] iPhone: same two checks
- [ ] Both: installed to the home screen, opens standalone with the right icon
- [ ] Both: airplane mode — the app opens and review works
- [ ] Both: storage survives an app close and a device restart
- [ ] Both: landscape usable on every screen

### Documents

- [ ] A real 100-page university PDF processes correctly
- [ ] All fixtures in `tests/fixtures/` behave as expected
- [ ] Every failure case shows the right message

### Generation quality

Not automatable, so this is the gate.

- [ ] 100 generated questions manually reviewed; 90% or more sound
- [ ] Every reviewed question's citation checked against the source page
- [ ] Distractors are plausible, not trivially eliminable
- [ ] Flashcards test one thing each
- [ ] Explanations at all three depths reviewed
- [ ] The not-covered-by-document case verified to refuse rather than invent

### Cost and limits

- [ ] Vercel, Upstash, and Firebase dashboards show $0
- [ ] `DAILY_GLOBAL_LIMIT` matches Google's currently published limit
- [ ] `npx license-checker --summary` shows only permissive licences
- [ ] Every service in use appears in [ZERO-COST-INFRASTRUCTURE.md](../04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md) with its limit and degradation

### Deployment

- [ ] Deployed and verified against the checklist in [DEPLOYMENT.md](../04-OPERATIONS/DEPLOYMENT.md)
- [ ] The deployed bundle searched for key-shaped strings; nothing found
- [ ] `/api/generate` rejects a foreign origin
- [ ] Quota exhaustion produces the correct message with a correct reset time
- [ ] Kill switch tested, then cleared

### Release admin

- [ ] `CHANGELOG.md` updated, written for users
- [ ] Version bumped
- [ ] Tagged and pushed
- [ ] GitHub release created with user-facing notes
- [ ] [ACTIVITY-LOG.md](../ACTIVITY-LOG.md) updated

## The five questions

If a checklist feels like ceremony, these are what it is actually protecting. Anything merging must be able to answer yes to all five.

1. **Does it cost nothing?** Every new dependency and service is free, with a named limit and a stated degradation.
2. **Does it work on a cheap phone?** Not a flagship on wifi.
3. **Does it work without an account?** Nothing may assume a login.
4. **Is generated content grounded?** Every item cites a real source, or it is not shown.
5. **Would a stressed student understand the words?** Including the error messages, especially the error messages.

## Deliberately not gated

| Not required | Why |
|---|---|
| A coverage percentage | Invites tests written to move a number |
| Screenshot comparison tests | Break on every intentional change, teach nothing |
| A second reviewer | Solo-maintained; CI plus the checklist is the gate |
| Performance budgets beyond bundle size | Real-device testing catches what matters |
| Automated prompt-quality checks | Not assertable; manual review instead |
