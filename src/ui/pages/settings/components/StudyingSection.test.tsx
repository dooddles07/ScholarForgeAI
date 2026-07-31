import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { db } from '@/persistence/db';
import { getSettings } from '@/persistence/settings';
import { StudyingSection } from './StudyingSection';

beforeEach(async () => {
  await db.settings.clear();
});

/* The Dexie live query seeds the row and resolves after the first paint, so the render is wrapped
   to let that settle inside act rather than warning about an update outside it. */
async function renderSection() {
  await act(async () => {
    render(<StudyingSection />);
  });
  return await screen.findByLabelText('Cards per day');
}

describe('cards per day', () => {
  /* Number('') is 0, which would ask the review session for no cards at all. */
  it('falls back to the default when the field is emptied', async () => {
    const input = await renderSection();
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    await waitFor(async () => {
      expect((await getSettings()).dailyCardLimit).toBe(20);
    });
  });

  it('clamps a value above the supported range', async () => {
    const input = await renderSection();
    fireEvent.change(input, { target: { value: '9999' } });
    fireEvent.blur(input);

    await waitFor(async () => {
      expect((await getSettings()).dailyCardLimit).toBe(200);
    });
  });

  it('keeps a value inside the range', async () => {
    const input = await renderSection();
    fireEvent.change(input, { target: { value: '45' } });
    fireEvent.blur(input);

    await waitFor(async () => {
      expect((await getSettings()).dailyCardLimit).toBe(45);
    });
  });

  /* Committing per keystroke is what let a half-typed "4" of "45" reach the database. */
  it('does not write while the user is still typing', async () => {
    const input = await renderSection();
    await act(async () => {
      fireEvent.change(input, { target: { value: '4' } });
    });
    expect((await getSettings()).dailyCardLimit).toBe(20);
  });

  /* Enter commits by blurring, which only fires when the field actually holds focus — as it does
     for anyone who just typed into it. */
  it('commits on Enter without waiting for focus to move', async () => {
    const input = await renderSection();
    input.focus();
    fireEvent.change(input, { target: { value: '60' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(async () => {
      expect((await getSettings()).dailyCardLimit).toBe(60);
    });
  });
});

describe('focus timer', () => {
  it('persists the toggle', async () => {
    await renderSection();
    fireEvent.click(screen.getByLabelText('Focus timer'));

    await waitFor(async () => {
      expect((await getSettings()).focusTimerEnabled).toBe(true);
    });
  });
});
