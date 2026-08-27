import {
	AnkiNote,
} from "../anki/anki-note";

import type {
	DuplicateHandling,
} from "../anki/duplicate-handling";

import {
	Flashcard,
} from "../flashcards/flashcard";

import {
	addAnkiNoteIdsToMarkdown,
} from "../flashcards/flashcard-markdown";

import {
	parseAnkiNoteId,
} from "../flashcards/flashcard-parser";

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
		duplicateHandling:
		DuplicateHandling,
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
	duplicateHandling:
	DuplicateHandling,
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
				.getNotes(
					noteIds,
				)
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

	const orphanedFlashcards:
		Flashcard[] = [];

	let updated = 0;

	let unchanged = 0;

	for (
		const flashcard
		of existingFlashcards
		) {

		const noteId =
			flashcard.ankiNoteId!;

		const ankiNote =
			notesById.get(
				noteId,
			);

		/*
		 * The Markdown contains an Anki ID,
		 * but that note no longer exists
		 * in Anki.
		 *
		 * Treat the flashcard as a card
		 * that needs to be created again.
		 */
		if (!ankiNote) {

			orphanedFlashcards.push(
				flashcard,
			);

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

	const flashcardsToCreate = [
		...newFlashcards,
		...orphanedFlashcards,
	];

	let created = 0;

	let missing = 0;

	let updatedMarkdown =
		markdown;

	if (
		flashcardsToCreate.length > 0
	) {

		const createdNoteIds =
			await ankiClient
				.addFlashcards(
					deckName,
					flashcardsToCreate,
					duplicateHandling,
				);

		created =
			createdNoteIds.filter(
				noteId =>
					noteId !== null,
			).length;

		/*
		 * addFlashcards receives:
		 *
		 * [
		 *     ...newFlashcards,
		 *     ...orphanedFlashcards,
		 * ]
		 *
		 * Therefore the first IDs belong
		 * to completely new cards.
		 */
		const newFlashcardNoteIds =
			createdNoteIds.slice(
				0,
				newFlashcards.length,
			);

		/*
		 * Existing helper can add IDs
		 * to flashcards that did not
		 * previously have one.
		 */
		updatedMarkdown =
			addAnkiNoteIdsToMarkdown(
				updatedMarkdown,
				newFlashcardNoteIds,
			);

		/*
		 * The remaining IDs correspond
		 * to cards whose old Anki note
		 * no longer existed.
		 */
		const orphanedNoteIds =
			createdNoteIds.slice(
				newFlashcards.length,
			);

		for (
			let index = 0;
			index <
			orphanedFlashcards.length;
			index++
		) {

			const flashcard =
				orphanedFlashcards[
					index
					];

			if (!flashcard) {
				continue;
			}

			const oldNoteId =
				flashcard.ankiNoteId;

			if (
				oldNoteId ===
				undefined
			) {
				continue;
			}

			const newNoteId =
				orphanedNoteIds[
					index
					];

			if (
				newNoteId === null ||
				newNoteId === undefined
			) {

				/*
				 * Anki did not create
				 * the card.
				 *
				 * Most likely because
				 * duplicate handling is
				 * set to "skip".
				 *
				 * The old ID is invalid,
				 * so remove it.
				 */
				updatedMarkdown =
					removeAnkiNoteId(
						updatedMarkdown,
						oldNoteId,
					);

				missing++;

				continue;
			}

			/*
			 * The old Anki note was gone,
			 * but a new one was created.
			 *
			 * Replace the stale ID with
			 * the new ID.
			 */
			updatedMarkdown =
				replaceAnkiNoteId(
					updatedMarkdown,
					oldNoteId,
					newNoteId,
				);
		}
	}

	return {
		created,
		updated,
		unchanged,
		missing,
		updatedMarkdown,
	};
}


function replaceAnkiNoteId(
	markdown: string,
	oldNoteId: number,
	newNoteId: number,
): string {

	const lines =
		markdown.split("\n");

	const lineIndex =
		lines.findIndex(
			line =>
				parseAnkiNoteId(
					line,
				) === oldNoteId,
		);

	if (
		lineIndex === -1
	) {
		return markdown;
	}

	lines[lineIndex] =
		`<!-- anki-note-id:${newNoteId} -->`;

	return lines.join("\n");
}


function removeAnkiNoteId(
	markdown: string,
	noteId: number,
): string {

	const lines =
		markdown.split("\n");

	const lineIndex =
		lines.findIndex(
			line =>
				parseAnkiNoteId(
					line,
				) === noteId,
		);

	if (
		lineIndex === -1
	) {
		return markdown;
	}

	lines.splice(
		lineIndex,
		1,
	);

	return lines.join("\n");
}
