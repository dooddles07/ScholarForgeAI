# Risks and Mitigations

Purpose: what could go wrong, how likely it is, and what we have already done about it.
Last updated: 2026-07-31

Ordered by how much damage each would do.

---

## R1 — Generated questions are bad

**Likelihood: medium. Impact: fatal.**

If the model produces questions that are wrong, trivial, or not actually about the document, the product has no reason to exist. A student who memorises a wrong answer is worse off than if they had never used it.

**Already mitigated**

- Grounding is enforced in three places: the prompt, the response schema, and server-side validation. Items without a verifiable citation are dropped before they reach the client. See [AI-INTEGRATION.md](../03-ARCHITECTURE/AI-INTEGRATION.md).
- Every item cites a page, and the citation opens the source passage so a student can check.
- Prompts include explicit negative examples and per-type rules, because generic instructions produce generic failures. See [PROMPT-LIBRARY.md](../03-ARCHITECTURE/PROMPT-LIBRARY.md).
- Answer positions are shuffled client-side, since positional bias survives prompting.
- Users can flag a bad question, which excludes it from scoring so they are never penalised for our error.
- v1.0 requires 100 manually reviewed questions at 90% or better before release.

**Watch for:** rising `GROUNDING_FAILED` counts, and clustered "this question looks wrong" reports.

**If it happens:** this is a prompt problem, not a UI problem. Iterate on prompts against the fixtures, changing one thing at a time and reviewing twenty items per change.

**Why this is first:** M5 exists specifically to answer this question early, before nine more milestones are built on the assumption that it works.

---

## R2 — The shared API key leaks

**Likelihood: low, given the architecture. Impact: high.**

A leaked key gets drained by strangers, and the consequence lands on the project owner's Google account.

**Already mitigated**

- The key is never in the client bundle. It lives only in Vercel environment variables. This is structural, not procedural, and it is the entire reason the proxy exists. See [ADR-0002](../08-DECISIONS/ADR-0002-SHARED-KEY-BEHIND-PROXY.md).
- A pre-commit hook scans staged changes for key-shaped strings.
- CI scans the built bundle and fails on a match.
- Tests assert the key never appears in any response, header, or error.
- The kill switch stops generation in one command, with no redeploy.
- Rotation takes minutes and is documented.

**If it happens:** kill switch, revoke, rotate, find the leak path, record it. Procedure in [DEPLOYMENT.md](../04-OPERATIONS/DEPLOYMENT.md). Users lose nothing, because nothing stored is ours.

---

## R3 — A user loses all their local data

**Likelihood: medium. Impact: high.**

Browser storage can be cleared by the user, by a cleanup tool, or by the browser itself under pressure. There is no server copy, by design. Losing a month of spaced-repetition scheduling is unrecoverable.

**Already mitigated**

- Export is a first-class, discoverable feature, not buried in settings.
- An export nudge appears after significant work, at most weekly.
- A first-run notice states plainly that data is local to this device regardless of sign-in.
- `navigator.storage.persist()` is requested, which browsers grant more readily to installed apps.
- Private browsing is detected and the user warned.
- Storage warnings at 80% and 95%.

**Residual risk: real and accepted.** This is the direct cost of the local-first decision, and it was weighed against the alternative — a free database that pauses after seven idle days. See [ADR-0001](../08-DECISIONS/ADR-0001-LOCAL-FIRST-STORAGE.md).

iOS is the weakest platform here; Safari evicts more aggressively. The export nudge matters most there.

---

## R4 — A bad migration destroys user data

**Likelihood: low. Impact: high.**

No server backup means a broken migration is permanent for that user.

**Already mitigated**

- Every migration is additive; a field is never removed in the same version that stops writing it.
- Every migration has a test using realistic pre-migration data.
- Migrations must be idempotent, since a tab can close mid-run.
- An export is prompted before any migration that alters existing rows.
- Released schema versions are never edited.

**One subtle case:** rolling back a release does not roll back a user's local database. Old code must tolerate a newer schema, which is exactly why migrations are additive. Noted in [GIT-WORKFLOW.md](../05-ENGINEERING/GIT-WORKFLOW.md).

---

## R5 — Parsing fails on real documents

**Likelihood: high. Impact: medium.**

Real-world PDFs are messy. This will happen; the question is whether it fails helpfully.

**Already mitigated**

- Known problems handled explicitly: multi-column reading order, hyphenation, ligatures, running headers.
- Scanned and password-protected files are detected and refused with a useful message rather than half-processed into garbage.
- Every failure names a next step, and none mentions internals.
- Committed fixtures covering the awkward cases.
- One document failing does not affect others in a study set.
- An issue template asks for the file, since these bugs are unfixable without it.

**Expected steady state:** an ongoing trickle of parsing bugs, each fixed by adding a fixture and a test. That is normal and healthy, not a sign something is wrong.

---

## R6 — The shared quota is too small

**Likelihood: high if the project gets any traction. Impact: low.**

A free tier measured in hundreds of daily requests, shared across all users.

**Already mitigated**

- Bring-your-own-key. A user with their own key is limited only by their own tier, so **the product scales to any number of users at zero cost.** This is the mitigation that makes the whole design viable.
- The global ceiling is set below the provider's real limit, so failure is clear rather than opaque.
- Per-IP limits prevent one user draining the pool.
- Generation is batched: one request for twenty questions, not twenty requests. Request count is the binding constraint, so batching is the highest-value optimisation.
- Nothing already generated stops working.
- The quota-exhausted message is honest, names the reset time, and offers the alternative.

**This is a designed state, not a failure.** Hitting the quota regularly would mean the project is being used, which is the goal.

**If it becomes constant:** promote BYOK more prominently, and consider implementing the documented OpenRouter fallback. Do not buy capacity; that would break the defining constraint.

---

## R7 — A free tier changes or disappears

**Likelihood: medium over a multi-year horizon. Impact: medium.**

Free tiers get worse. Gemini's rate limits could shrink, Vercel's or Upstash's terms could change.

**Already mitigated**

- Rate limits are configuration, never hardcoded, and reviewed quarterly.
- The provider sits behind one module, so switching is contained.
- OpenRouter is documented as a fallback.
- Static output plus one function is portable to almost any host.
- Fallback plans for each dependency in [ZERO-COST-INFRASTRUCTURE.md](../04-OPERATIONS/ZERO-COST-INFRASTRUCTURE.md).

**Worst case:** all free AI tiers vanish. The product becomes bring-your-own-key only, and every non-AI feature — review, saved quizzes, exams, exports, dashboard — keeps working. **Losing the provider degrades the product rather than killing it**, which was a deliberate architectural goal.

---

## R8 — It is slow on cheap phones

**Likelihood: medium. Impact: medium.**

The target device is a mid-range Android phone, not a flagship. Parsing a large PDF client-side is genuinely demanding.

**Already mitigated**

- Parsing runs in a Web Worker, so the interface never freezes.
- Parsers are lazy-loaded per format.
- A 300 KB gzipped initial-bundle budget, enforced in CI.
- System fonts only: no download, no layout shift.
- Hard 50 MB file ceiling, and a page-range option above 200 pages.
- Real-device testing is a release requirement, not optional.

**The check that matters:** a 100-page PDF in under 10 seconds on real mid-range hardware. Verified by hand, since no emulator reproduces it.

---

## R9 — Prompt injection via a document

**Likelihood: low. Impact: low.**

A document could contain text trying to instruct the model.

**Already mitigated**

- Document text is delimited and labelled as data.
- The system instruction states that instructions found inside documents are not to be followed.
- Structured output means a hijacked response fails schema validation.
- Grounding validation requires real page numbers and real quotes.

**The blast radius is inherently small.** The worst realistic outcome is a bad question for the person who uploaded the file. There is no other user's data to reach, no account to compromise, and no privileged action available.

---

## R10 — Nobody uses it

**Likelihood: medium. Impact: it is a personal project, so low.**

**Already mitigated**

- Google sign-in is the only barrier to trying it — one tap, no separate signup form or email verification.
- Under two minutes from landing to first question.
- Free with no trial mechanics.
- Shareable by link, no install required.

**Watch for:** traffic with almost no AI requests. That means people land and leave without uploading, which is a landing-page problem rather than a product problem. See [SUCCESS-METRICS.md](../01-PRODUCT/SUCCESS-METRICS.md).

---

## R11 — Scope creep stalls the project

**Likelihood: high. This is the most likely reason a solo project never ships.**

**Already mitigated**

- [NON-GOALS-AND-SCOPE.md](../01-PRODUCT/NON-GOALS-AND-SCOPE.md) exists specifically to be cited when saying no.
- A five-question scope guard every feature must pass.
- Seven ADRs recording decisions already made, so the same ground is not re-covered.
- A documented cut order in [ROADMAP.md](ROADMAP.md).
- Milestones with hard exit criteria rather than judgement calls.
- v2 candidates are explicitly gated on users asking, not on the author imagining.

**The discipline that matters:** v1.0 contains no new features, only verification. A milestone that keeps growing never completes.

---

## R12 — Maintenance burden

**Likelihood: certain over time. Impact: medium.**

One person, and interest fluctuates.

**Already mitigated**

- Minimal dependencies, so less to keep updated.
- No server, no database, nothing to operate day to day.
- Response commitments deliberately modest, so they can be honoured.
- Contributors can run the whole app with no API key, which removes the largest onboarding barrier.
- Planning documents are public, so someone else could pick it up.
- If the project goes quiet, it keeps working. There is nothing to expire and nothing to pause.

That last point is worth stating. A neglected project with a server and a database degrades. This one does not: a deployed static site with a working key keeps serving, and everything stored locally keeps working regardless.

---

## Accepted without mitigation

| Risk | Why accepted |
|---|---|
| Users behind shared NAT share a rate-limit bucket | Unavoidable with IP-based limiting; BYOK is the answer |
| A determined abuser rotates IP addresses | The global ceiling caps damage; defending properly needs accounts |
| Read-aloud quality varies by platform | Web Speech API limitation, and no free alternative exists |
| Scanned documents cannot be used | Out of scope for v1, stated honestly |
| No client-error visibility | The alternative is shipping a tracking SDK |
| No alerting | No free alerting exists that does not involve a third party |
| English only | v1 scope decision |

Each is stated rather than hidden. Users deserve to know the limits, and future contributors deserve to know these were choices rather than oversights.

---

## Review

Reassess quarterly, or after any incident. Record changes in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md).

A risk that materialises gets its mitigation reviewed, not just the immediate problem fixed.
