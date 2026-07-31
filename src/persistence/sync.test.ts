import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { BackupPayload } from '@/domain/export/backup';

const mockDoc = vi.fn((_firestore: unknown, _collection: unknown, _docId: unknown) => 'doc-ref');
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
}));

vi.mock('@/lib/firestore', () => ({
  firestore: () => 'fake-firestore',
}));

const { BackupTooLargeError, pullBackupFromCloud, pushBackupToCloud } = await import('./sync');

const payload: BackupPayload = {
  version: 1,
  exportedAt: 0,
  documents: [],
  studySets: [],
  decks: [],
  cards: [],
  quizzes: [],
  attempts: [],
  exams: [],
  conversations: [],
  reviewLog: [],
};

beforeEach(() => {
  mockDoc.mockClear();
  mockGetDoc.mockReset();
  mockSetDoc.mockReset();
});

describe('pushBackupToCloud', () => {
  it('writes the payload to backups/{uid}', async () => {
    await pushBackupToCloud('user-1', payload);
    expect(mockDoc).toHaveBeenCalledWith('fake-firestore', 'backups', 'user-1');
    expect(mockSetDoc).toHaveBeenCalledWith('doc-ref', payload);
  });

  it('refuses a payload past the per-document limit rather than letting Firestore reject it', async () => {
    const huge: BackupPayload = {
      ...payload,
      conversations: [
        { padding: 'x'.repeat(1_000_000) },
      ] as unknown as BackupPayload['conversations'],
    };
    await expect(pushBackupToCloud('user-1', huge)).rejects.toBeInstanceOf(BackupTooLargeError);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('pullBackupFromCloud', () => {
  it('returns null when no backup document exists', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    expect(await pullBackupFromCloud('user-1')).toBeNull();
  });

  it('returns the payload when a valid backup exists', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => payload });
    expect(await pullBackupFromCloud('user-1')).toEqual(payload);
  });

  it('returns null when the stored document is not a valid backup shape', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ nonsense: true }) });
    expect(await pullBackupFromCloud('user-1')).toBeNull();
  });
});
