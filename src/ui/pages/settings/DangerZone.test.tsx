import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { db } from '@/persistence/db';
import { getSettings, updateSettings } from '@/persistence/settings';
import { storage } from '@/copy/labels';
import { DangerZone } from './DangerZone';

beforeEach(async () => {
  await db.settings.clear();
});

async function renderZone() {
  await act(async () => {
    render(<DangerZone />);
  });
  await screen.findByText('Delete everything');
}

describe('local data warning', () => {
  it('shows on a browser that has not seen it', async () => {
    await renderZone();
    expect(screen.getByText(storage.firstRun)).toBeInTheDocument();
  });

  /* The flag existed in the schema but nothing read it, so the warning used to be permanent.
     Repeating a warning every visit teaches people to stop reading warnings. */
  it('stays dismissed once acknowledged', async () => {
    await renderZone();
    fireEvent.click(screen.getByText('Got it'));

    await waitFor(async () => {
      expect((await getSettings()).hasSeenLocalDataWarning).toBe(true);
    });
    await waitFor(() => {
      expect(screen.queryByText(storage.firstRun)).not.toBeInTheDocument();
    });
  });

  it('does not reappear on a later visit', async () => {
    await updateSettings({ hasSeenLocalDataWarning: true });
    await renderZone();
    expect(screen.queryByText(storage.firstRun)).not.toBeInTheDocument();
  });
});

describe('delete confirmation', () => {
  /* Destructive and irreversible, so it must never be one click away. */
  it('asks before deleting anything', async () => {
    await renderZone();
    expect(screen.queryByText('Yes, delete it all')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete everything'));
    expect(await screen.findByText('Delete everything?')).toBeInTheDocument();
    expect(screen.getByText('Yes, delete it all')).toBeInTheDocument();
    expect(screen.getByText('Keep my data')).toBeInTheDocument();
  });
});
