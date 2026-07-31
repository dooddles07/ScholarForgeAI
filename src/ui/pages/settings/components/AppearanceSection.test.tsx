import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { db } from '@/persistence/db';
import { getSettings } from '@/persistence/settings';
import { AppearanceSection } from './AppearanceSection';

beforeEach(async () => {
  await db.settings.clear();
});

async function renderSection() {
  await act(async () => {
    render(<AppearanceSection />);
  });
  return await screen.findByLabelText('Theme');
}

describe('theme', () => {
  it('offers system first and starts there', async () => {
    const select = await renderSection();
    expect(select).toHaveValue('system');
  });

  it('persists an explicit choice', async () => {
    const select = await renderSection();
    fireEvent.change(select, { target: { value: 'light' } });

    await waitFor(async () => {
      expect((await getSettings()).theme).toBe('light');
    });
  });
});

describe('reduce motion', () => {
  /* Stored as a union rather than a boolean: 'system' defers to the device's own setting, which
     is why the toggle maps to 'always' and back rather than true and false. */
  it('maps the toggle onto the stored union', async () => {
    await renderSection();
    const toggle = screen.getByLabelText('Reduce motion');

    fireEvent.click(toggle);
    await waitFor(async () => {
      expect((await getSettings()).reduceMotion).toBe('always');
    });

    fireEvent.click(toggle);
    await waitFor(async () => {
      expect((await getSettings()).reduceMotion).toBe('system');
    });
  });
});

describe('reading mode', () => {
  it('persists the toggle', async () => {
    await renderSection();
    fireEvent.click(screen.getByLabelText('Reading mode'));

    await waitFor(async () => {
      expect((await getSettings()).readingMode).toBe(true);
    });
  });
});
