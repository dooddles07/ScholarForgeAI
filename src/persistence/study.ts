import type { Attempt, Card, Conversation, Deck, Exam, Quiz, ReviewLogEntry } from '@/domain/types';
import { db } from './db';

export function saveQuiz(quiz: Quiz): Promise<string> {
  return db.quizzes.put(quiz);
}

export function getQuiz(id: string): Promise<Quiz | undefined> {
  return db.quizzes.get(id);
}

export function saveAttempt(attempt: Attempt): Promise<string> {
  return db.attempts.put(attempt);
}

export function listAttempts(): Promise<Attempt[]> {
  return db.attempts.orderBy('startedAt').reverse().toArray();
}

export function saveDeck(deck: Deck): Promise<string> {
  return db.decks.put(deck);
}

export function getDeck(id: string): Promise<Deck | undefined> {
  return db.decks.get(id);
}

export function listDecks(): Promise<Deck[]> {
  return db.decks.orderBy('createdAt').reverse().toArray();
}

export async function saveCards(cards: Card[]): Promise<void> {
  await db.cards.bulkPut(cards);
}

export function saveCard(card: Card): Promise<string> {
  return db.cards.put(card);
}

export function listCardsInDeck(deckId: string): Promise<Card[]> {
  return db.cards.where('deckId').equals(deckId).toArray();
}

export async function listDueCards(limit: number): Promise<Card[]> {
  const due = await db.cards.where('due').belowOrEqual(Date.now()).toArray();
  return due.filter((c) => !c.isSuspended).slice(0, limit);
}

export function appendReviewLog(entry: ReviewLogEntry): Promise<string> {
  return db.reviewLog.put(entry);
}

export function listReviewLog(): Promise<ReviewLogEntry[]> {
  return db.reviewLog.orderBy('reviewedAt').toArray();
}

export function saveExam(exam: Exam): Promise<string> {
  return db.exams.put(exam);
}

export function getExam(id: string): Promise<Exam | undefined> {
  return db.exams.get(id);
}

export function saveConversation(conversation: Conversation): Promise<string> {
  return db.conversations.put(conversation);
}

export function getConversationForDocument(documentId: string): Promise<Conversation | undefined> {
  return db.conversations.where('documentId').equals(documentId).first();
}

export async function deleteEverything(): Promise<void> {
  await Promise.all(db.tables.map((table) => table.clear()));
}
