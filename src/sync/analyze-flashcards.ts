import type {AnkiNote} from "../anki/anki-note";
import type {DuplicateHandling} from "../anki/duplicate-handling";
import type {Flashcard} from "../flashcards/flashcard";
import {hasFlashcardChanged} from "../flashcards/flashcard-sync";
import type {SyncOperation, SyncPlan,} from "./sync-plan";

export interface FlashcardAnalysisClient {
	getNotes(noteIds: number[],): Promise<AnkiNote[]>;

	canAddFlashcards(deckName: string, flashcards: Flashcard[], duplicateHandling: DuplicateHandling,): Promise<boolean[]>;
}

export async function analyzeFlashcards(ankiClient: FlashcardAnalysisClient, deckName: string, flashcards: Flashcard[], duplicateHandling: DuplicateHandling): Promise<SyncPlan> {
	const existingFlashcards = flashcards.filter(flashcard => flashcard.ankiNoteId !== undefined);
	const noteIds = existingFlashcards.map(flashcard => flashcard.ankiNoteId!);
	const ankiNotes = noteIds.length > 0 ? await ankiClient.getNotes(noteIds) : [];
	const notesById = new Map(ankiNotes.map(note => [note.noteId, note]));

	const createCandidates = flashcards.filter(flashcard => {

		if (flashcard.ankiNoteId === undefined) {
			return true;
		}

		return !notesById.has(flashcard.ankiNoteId);
	});

	const canAddResults = createCandidates.length > 0 ? await ankiClient.canAddFlashcards(deckName, createCandidates, duplicateHandling) : [];
	const canAddByFlashcard = new Map<Flashcard, boolean>();
	createCandidates.forEach((flashcard, index) => {
		canAddByFlashcard.set(flashcard, canAddResults[index] ?? false);
	},);

	const operations: SyncOperation[] = [];
	for (const flashcard of flashcards) {
		const noteId = flashcard.ankiNoteId;
		if (noteId === undefined) {
			const canAdd = canAddByFlashcard.get(flashcard) ?? false;
			if (canAdd) {
				operations.push({type: "create", flashcard});
			} else {
				operations.push({type: "skip", flashcard, reason: "duplicate"});
			}
			continue;
		}

		const ankiNote = notesById.get(noteId);

		if (!ankiNote) {
			const canAdd = canAddByFlashcard.get(flashcard) ?? false;
			if (canAdd) {
				operations.push({type: "create", flashcard, previousNoteId: noteId});
			} else {
				operations.push({type: "skip", flashcard, reason: "duplicate", previousNoteId: noteId});
			}
			continue;
		}
		if (!hasFlashcardChanged(flashcard, ankiNote)) {
			operations.push({
				type: "unchanged", flashcard, noteId,
			});
			continue;
		}
		operations.push({
			type: "update",
			flashcard,
			noteId,
			previousFront: ankiNote.fields.Front.value,
			previousBack: ankiNote.fields.Back.value,
		});
	}

	return {
		deckName, duplicateHandling, operations,
	};
}
