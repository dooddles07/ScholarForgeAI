# Git Workflow

Purpose: branches, commits, and releases.
Last updated: 2026-07-30

## Branches

| Branch | Purpose |
|---|---|
| `main` | Always deployable. Every push deploys to production. |
| `feat/<slug>` | A feature |
| `fix/<slug>` | A bug fix |
| `docs/<slug>` | Documentation only |
| `chore/<slug>` | Tooling, dependencies, config |

No `develop` branch. A solo-maintained project with continuous deployment does not need a second integration branch, and having one just delays feedback.

`main` is protected: no direct pushes, CI must pass, and pull requests are required.

## Commits

Conventional Commits.

```
<type>(<scope>): <subject>
```

| Type | Use |
|---|---|
| `feat` | New user-facing capability |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | Restructuring with no behaviour change |
| `test` | Tests only |
| `perf` | Performance |
| `chore` | Tooling, dependencies |
| `style` | Formatting only |

Scopes match the structure: `parsing`, `quiz`, `flashcards`, `review`, `exam`, `chat`, `dashboard`, `ai`, `persistence`, `ui`, `copy`, `proxy`, `pwa`.

```
feat(quiz): add per-topic accuracy breakdown to results
fix(parsing): rejoin words split by hyphenation across lines
docs(architecture): record the BM25 retrieval decision
```

### Rules

- Subject in imperative mood: "add", not "added" or "adds"
- No trailing full stop
- Under 72 characters
- One logical change per commit
- Body explains **why** when the reason is not obvious from the diff
- Reference the requirement id from [PRODUCT-REQUIREMENTS.md](../01-PRODUCT/PRODUCT-REQUIREMENTS.md) where one applies

```
fix(quiz): shuffle answer options after generation

Models place the correct answer in position B far more often than
chance, which makes quizzes guessable without knowing the material.
Prompting does not fix it reliably, so shuffle client-side once and
store the result so resumed sessions stay consistent.

Refs B1
```

That body is the shape to aim for: it explains a non-obvious reason and why the alternative was rejected.

### Atomic commits

One change per commit. A commit that fixes a bug, renames a variable, and updates a dependency is three commits.

Reason: a good history is the cheapest debugging tool available. `git bisect` only works if commits are individually coherent.

### Never committed

| Never | Why |
|---|---|
| API keys, tokens, or `.env` | The one secret in the system. See [SECURITY-AND-PRIVACY.md](../04-OPERATIONS/SECURITY-AND-PRIVACY.md) |
| `node_modules`, `dist` | Build output |
| Personal editor config | Belongs in a global gitignore |
| Large binaries | Except the test fixtures, which are deliberate and necessary |

A pre-commit hook scans staged changes for key-shaped strings, and CI scans the built bundle. Both are worth having; the hook catches it early and CI catches what bypasses the hook.

### Documentation and activity logs

**Do not commit documentation or activity-log changes together with feature code.** Separate commits.

Reason: mixing them makes the feature diff harder to review, and makes the documentation history harder to follow. It also means a revert of a feature does not accidentally revert unrelated notes.

## Pull requests

Even solo. The pull request is where CI runs and where a preview deployment appears.

**Title** follows the commit convention. **Body** covers:

- What changed and why
- The requirement id, if applicable
- How it was verified, including real-device testing where relevant
- Screenshots for interface changes, at 360px and 1280px
- Anything deliberately left out

Both viewports for screenshots, because a change that looks right on desktop and breaks at 360px is the most common regression in a responsive app.

### Merging

**Squash merge** by default. One feature becomes one commit on `main`, so the history reads as a list of changes rather than a list of work-in-progress states.

Rebase merge when a series of commits is genuinely worth preserving individually. Never a merge commit; they add noise without adding information.

Delete the branch after merging.

## Releases

Semantic versioning, tagged on `main`.

| Bump | When |
|---|---|
| Patch | Bug fixes |
| Minor | New features, backwards compatible |
| Major | A breaking change to stored data or export format |

Major is reserved for something that breaks a user's existing data or an export another tool might consume. Interface changes, however large, are not breaking.

### Process

1. Confirm the checklist in [DEFINITION-OF-DONE.md](DEFINITION-OF-DONE.md)
2. Update `CHANGELOG.md`
3. Bump the version in `package.json`
4. Tag: `git tag -a v1.2.0 -m "v1.2.0"`
5. Push the tag
6. Create a GitHub release with notes written for users, not developers
7. Record it in [ACTIVITY-LOG.md](../ACTIVITY-LOG.md)

Release notes are for students, not contributors. "Slide decks with speaker notes now work properly" rather than "refactored the PPTX XML traversal".

### Changelog

Keep a Changelog format, grouped as Added, Changed, Fixed, Removed. Written from the user's point of view.

## Reverting

`git revert` on `main`, never a force push. `main` is deployed and may be checked out by contributors; rewriting it breaks their clones.

If a release needs pulling urgently, promote the previous Cloudflare deployment from the dashboard first, then revert in git. That gets the site fixed in seconds rather than waiting for a build.

**One caution.** If the reverted version added a Dexie schema version, reverting the client does not revert a user's local database. Old code must tolerate a newer schema, which is why every migration is additive. See [DATA-MODEL.md](../03-ARCHITECTURE/DATA-MODEL.md).

## Hygiene

- Rebase on `main` before opening a pull request
- Keep branches short-lived; a week is long
- One branch, one concern
- Fix up work-in-progress commits before opening the pull request
- Never force push a shared branch

## Contributors

Fork, branch, pull request. Details in [CONTRIBUTING.md](../07-OPEN-SOURCE/CONTRIBUTING.md) and [ISSUE-AND-PR-GUIDE.md](../07-OPEN-SOURCE/ISSUE-AND-PR-GUIDE.md).
