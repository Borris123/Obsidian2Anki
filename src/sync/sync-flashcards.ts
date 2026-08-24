import {
	AnkiNote,
} from "../anki/anki-note";

import {
	Flashcard,
} from "../flashcards/flashcard";

import {
	addAnkiNoteIdsToMarkdown,
} from "../flashcards/flashcard-markdown";

import {
	hasFlashcardChanged,
} from "../flashcards/flashcard-sync";

export interface FlashcardSyncClient {

	getNotes(
		noteIds: number[],
	): Promise<AnkiNote[]>;

	updateFlashcard(
		noteId: number,
		flashcard: Flashcard,
	): Promise<void>;

	addFlashcards(
		deckName: string,
		flashcards: Flashcard[],
	): Promise<(number | null)[]>;
}

export interface SyncResult {
	created: number;
	updated: number;
	unchanged: number;
	missing: number;
	updatedMarkdown: string;
}

export async function syncFlashcards(
	ankiClient: FlashcardSyncClient,
	deckName: string,
	markdown: string,
	flashcards: Flashcard[],
): Promise<SyncResult> {

	const newFlashcards =
		flashcards.filter(
			flashcard =>
				flashcard.ankiNoteId ===
				undefined,
		);

	const existingFlashcards =
		flashcards.filter(
			flashcard =>
				flashcard.ankiNoteId !==
				undefined,
		);

	const noteIds =
		existingFlashcards.map(
			flashcard =>
				flashcard.ankiNoteId!,
		);

	const ankiNotes =
		noteIds.length > 0
			? await ankiClient
				.getNotes(noteIds)
			: [];

	const notesById =
		new Map(
			ankiNotes.map(
				note => [
					note.noteId,
					note,
				],
			),
		);

	let updated = 0;
	let unchanged = 0;
	let missing = 0;

	for (
		const flashcard
		of existingFlashcards
		) {

		const noteId =
			flashcard.ankiNoteId!;

		const ankiNote =
			notesById.get(noteId);

		if (!ankiNote) {
			missing++;

			continue;
		}

		if (
			!hasFlashcardChanged(
				flashcard,
				ankiNote,
			)
		) {
			unchanged++;

			continue;
		}

		await ankiClient
			.updateFlashcard(
				noteId,
				flashcard,
			);

		updated++;
	}

	let created = 0;

	let updatedMarkdown =
		markdown;

	if (newFlashcards.length > 0) {

		const createdNoteIds =
			await ankiClient
				.addFlashcards(
					deckName,
					newFlashcards,
				);

		created =
			createdNoteIds.filter(
				id => id !== null,
			).length;

		updatedMarkdown =
			addAnkiNoteIdsToMarkdown(
				markdown,
				createdNoteIds,
			);
	}

	return {
		created,
		updated,
		unchanged,
		missing,
		updatedMarkdown,
	};
}
