import type { Card } from '@/domain/types';
import { toCsv } from './csv';

/* Front and back only, no header row. Both Anki and Quizlet import a plain two-column CSV with
   no setup, which is the point: no app-specific format, so the cards are usable even if this
   app disappears. Same shape for both destinations, exposed as one function. */
export function buildCardsCsv(cards: Card[]): string {
  return toCsv(cards.map((card) => [card.front, card.back]));
}
