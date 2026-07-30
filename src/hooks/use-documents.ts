import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/persistence/db';
import { getDocument, listDocuments } from '@/persistence/documents';

export function useDocuments() {
  return useLiveQuery(() => listDocuments(), [], undefined);
}

export function useDocument(id: string | undefined) {
  return useLiveQuery(() => (id ? getDocument(id) : Promise.resolve(undefined)), [id], undefined);
}

export function useDocumentCount() {
  return useLiveQuery(() => db.documents.count(), [], undefined);
}
