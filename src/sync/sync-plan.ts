import type {Flashcard} from "../flashcards/flashcard";
import type {DuplicateHandling} from "../anki/duplicate-handling";

export type SyncOperation =
	{ type: "create"; flashcard: Flashcard; previousNoteId?: number; } |
	{ type: "update"; flashcard: Flashcard; noteId: number; previousFront: string; previousBack: string; } |
	{ type: "unchanged"; flashcard: Flashcard; noteId: number; } |
	{ type: "skip"; flashcard: Flashcard; reason: "duplicate"; previousNoteId?: number; };

export interface SyncPlan {
	deckName: string;
	duplicateHandling: DuplicateHandling;
	operations: SyncOperation[];
}
