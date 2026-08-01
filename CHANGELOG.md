# Changelog

User-facing changes. Written for someone using the app, not reading the diff.

The project is pre-1.0 and deploys continuously from `main`, so these are dated groupings rather
than tagged releases.

## Unreleased

### Added

- **Preferences follow your account.** Theme, reading mode, reduce motion, cards-per-day, the focus
  timer, and your study streak now sync automatically across every device you sign in on, and
  update live without a reload. No study content travels with them.
- **Reduce motion setting.** Turns off sliding and fading in the app. Your device setting is still
  honoured either way.
- **Focus timer.** Shows how long you have been reviewing.
- **Storage used.** Settings now shows how much space the app is using and warns before the browser
  runs out. The app also asks the browser once to stop treating your study data as disposable cache.
- **Backups now include your preferences**, so restoring on a new device brings your settings with
  it. Older backup files still import.
- **The local-data warning can be dismissed** instead of reappearing on every visit.

### Fixed

- **Cards per day could be set to zero** by clearing the field, which left review sessions with
  nothing to show. The value is now held within 5–200 wherever it is set.
- **"Match my device" flashed the dark theme** on light-mode devices before correcting itself.
- **The theme survived "Delete everything"**, so a wiped browser reopened in the deleted account's
  theme.
- **"Backup restored" stayed on screen** for the rest of the session, and could still be showing
  after a later import failed.
- **Syncing while offline reported a sync failure** rather than saying you were offline.
- **A large library failed to sync with no explanation.** It now says so before trying, and points
  at file export, which has no size limit.
- The default theme is "match my device" rather than dark.

### Changed

- Sign-in is required for the whole app.
- Generation runs against the real service in local development by default; contributors without
  credentials opt into fixtures with `VITE_MOCK_AI=true`.

### Security

- Cloud storage rules now reject malformed or oversized writes, not just writes from the wrong
  account.

## 2026-07-31 — Groq, and the end of bring-your-own-key

### Changed

- **Generation moved from Google Gemini to Groq.** Gemini retired the model this project used for
  new API keys without notice, and its free daily allowance measured far lower in practice than
  published.
- **Bring-your-own-key was removed.** Everyone uses the shared key. When the daily quota runs out,
  generation stops until it resets, and the app says so plainly. There is no longer an alternative
  path for heavy users.

### Fixed

- **Sign-in failed in Chrome.** The redirect flow depended on cross-site storage that browsers now
  block; sign-in uses a popup instead.
- Sign-out now returns to the landing page rather than an empty gate.
- Quiz difficulty and question-type choices were silently dropped during real generation.
- Completed quiz attempts were not saved, so the dashboard had no real data to work from.

## 2026-07-30 — Cloud sync and exams

### Added

- **Sync across devices.** Sign in with Google and push your library to your own cloud backup, then
  pull it on another device. Nothing is uploaded until you ask.
- **Practice exams** with configurable count, time limit, and marks, resumable if you close the app.
- **Study streak**, with one missed day forgiven.
- **Export and restore.** Backup files, plus Anki and Quizlet CSV.
- **Offline install.** Add the app to your home screen; everything except generating new content
  works with no connection.

## Earlier

- Real generation behind a server-side proxy, so nobody has to configure anything.
- PowerPoint, Word, and EPUB parsing alongside PDF.
- BM25 retrieval, replacing naive term overlap.
- Marketing page, app shell, quizzes, flashcards with spaced repetition, ask-your-document, and the
  progress dashboard.
