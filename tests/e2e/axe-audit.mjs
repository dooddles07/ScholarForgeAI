/*
 * Accessibility sweep across every route, at the two viewports that matter most.
 * Run with: node tests/e2e/axe-audit.mjs  (dev server must be running on 5180)
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.env.BASE_URL ?? 'http://localhost:5180';

const ROUTES = [
  '/',
  '/app/library',
  '/app/doc/doc-mock-respiration',
  '/app/quiz/doc-mock-respiration',
  '/app/cards/doc-mock-respiration',
  '/app/review',
  '/app/chat/doc-mock-respiration',
  '/app/exam/doc-mock-respiration',
  '/app/dashboard',
  '/app/settings',
];

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
];

const browser = await chromium.launch();
let totalViolations = 0;

/*
 * Colour contrast must be measured once the page has settled. Sampling mid-transition reads a
 * half-faded composite (a fading-in element literally is low contrast for a few hundred ms) and
 * reports failures that no user ever sees. `reducedMotion` removes entrance animation entirely,
 * which is both the deterministic state to audit and a check that the reduced-motion path renders.
 */
async function settle(page) {
  await page
    .waitForFunction(
      () => document.getAnimations().every((a) => a.playState === 'finished' || a.playState === 'idle'),
      null,
      { timeout: 3000 },
    )
    .catch(() => {});
}

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();

  // Seed the sample document so routes that need one have real content to audit.
  await page.goto(`${BASE}/app/library`);
  await page.evaluate(() => localStorage.clear());
  await page.getByRole('button', { name: /sample document/i }).click().catch(() => {});
  await page.waitForTimeout(400);

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`);
    await page.waitForTimeout(500);
    await settle(page);
    await page.addScriptTag({ content: axeSource });

    const results = await page.evaluate(async () => {
      const r = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      });
      return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
        help: v.help,
        target: v.nodes[0]?.target?.join(' ') ?? '',
      }));
    });

    // Horizontal scroll is a hard failure at every width, per RESPONSIVE-AND-MOBILE.md.
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );

    if (results.length > 0 || scrolls) {
      totalViolations += results.length + (scrolls ? 1 : 0);
      console.log(`\n[${viewport.name}] ${route}`);
      if (scrolls) console.log('  HORIZONTAL SCROLL');
      for (const v of results) {
        console.log(`  ${v.impact}: ${v.id} (${v.nodes}) ${v.help} -> ${v.target}`);
      }
    }
  }

  await context.close();
}

await browser.close();
console.log(totalViolations === 0 ? '\nClean.' : `\n${totalViolations} issues.`);
process.exit(totalViolations === 0 ? 0 : 1);
