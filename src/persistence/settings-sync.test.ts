import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SyncedSettings } from '@/domain/settings/synced';

const mockDoc = vi.fn((_firestore: unknown, _collection: unknown, _docId: unknown) => 'doc-ref');
const mockSetDoc = vi.fn();
const mockOnSnapshot = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  setDoc: mockSetDoc,
  onSnapshot: mockOnSnapshot,
}));

vi.mock('@/lib/firestore', () => ({
  firestore: () => 'fake-firestore',
}));

const { pushSettings, subscribeToSettings } = await import('./settings-sync');

const synced: SyncedSettings = {
  theme: 'dark',
  readingMode: false,
  reduceMotion: 'system',
  dailyCardLimit: 20,
  focusTimerEnabled: false,
  streakCount: 2,
  streakLastDay: '2026-07-31',
  streakGraceUsed: false,
  updatedAt: 1000,
};

/* Drives the callback onSnapshot was registered with, standing in for the server. */
function emit(snapshot: { metadata: { hasPendingWrites: boolean }; data: () => unknown }) {
  const onNext = mockOnSnapshot.mock.calls[0]?.[1] as (s: unknown) => void;
  onNext(snapshot);
}

beforeEach(() => {
  mockDoc.mockClear();
  mockSetDoc.mockReset();
  mockOnSnapshot.mockReset();
  mockOnSnapshot.mockReturnValue(() => undefined);
});

describe('pushSettings', () => {
  it('writes to userSettings/{uid}, not the backup document', async () => {
    await pushSettings('user-1', synced);
    expect(mockDoc).toHaveBeenCalledWith('fake-firestore', 'userSettings', 'user-1');
    expect(mockSetDoc).toHaveBeenCalledWith('doc-ref', synced);
  });
});

describe('subscribeToSettings', () => {
  it('passes a valid remote copy through', () => {
    const onRemote = vi.fn();
    subscribeToSettings('user-1', onRemote);
    emit({ metadata: { hasPendingWrites: false }, data: () => synced });
    expect(onRemote).toHaveBeenCalledWith(synced);
  });

  /* This device's own write echoing back through the local cache. Acting on it would restart the
     push that produced it. */
  it('ignores a snapshot that is still this devices pending write', () => {
    const onRemote = vi.fn();
    subscribeToSettings('user-1', onRemote);
    emit({ metadata: { hasPendingWrites: true }, data: () => synced });
    expect(onRemote).not.toHaveBeenCalled();
  });

  it('ignores a document that does not match the expected shape', () => {
    const onRemote = vi.fn();
    subscribeToSettings('user-1', onRemote);
    emit({ metadata: { hasPendingWrites: false }, data: () => ({ theme: 'neon' }) });
    emit({ metadata: { hasPendingWrites: false }, data: () => undefined });
    expect(onRemote).not.toHaveBeenCalled();
  });

  it('returns the unsubscribe handle so a sign-out tears the listener down', () => {
    const unsubscribe = vi.fn();
    mockOnSnapshot.mockReturnValue(unsubscribe);
    expect(subscribeToSettings('user-1', vi.fn())).toBe(unsubscribe);
  });
});
