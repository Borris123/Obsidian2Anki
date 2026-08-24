import { Flashcard } from "./flashcard";

const FLASHCARD_SEPARATOR = ' :: '
const ANKI_NOTE_ID_PATTERN = /^<!--\s*anki-note-id:(\d+)\s*-->$/;

export function parseFlashcardLine(
	line: string,
): Pick<Flashcard, "front" | "back"> | null {

	const separatorIndex =
		line.indexOf(FLASHCARD_SEPARATOR);

	if (separatorIndex === -1) {
		return null;
	}

	const front =
		line.substring(0, separatorIndex).trim();

	const back =
		line
			.substring(
				separatorIndex +
				FLASHCARD_SEPARATOR.length,
			)
			.trim();

	if (!front || !back) {
		return null;
	}

	return {
		front,
		back,
	};
}

export function parseAnkiNoteId(
	line: string,
): number | undefined {

	const match =
		line.trim().match(
			ANKI_NOTE_ID_PATTERN,
		);

	if (!match) {
		return undefined;
	}

	return Number(match[1]);
}

export function parseFlashcards(
	markdown: string,
): Flashcard[] {

	const flashcards: Flashcard[] = [];

	let pendingAnkiNoteId:
		number | undefined;

	for (const line of markdown.split("\n")) {

		const trimmedLine = line.trim();

		if (!trimmedLine) {
			continue;
		}

		const ankiNoteId =
			parseAnkiNoteId(line);

		if (ankiNoteId !== undefined) {
			pendingAnkiNoteId =
				ankiNoteId;

			continue;
		}

		const parsedFlashcard =
			parseFlashcardLine(line);

		if (!parsedFlashcard) {
			pendingAnkiNoteId =
				undefined;

			continue;
		}

		flashcards.push({
			...parsedFlashcard,
			ankiNoteId:
			pendingAnkiNoteId,
		});

		pendingAnkiNoteId =
			undefined;
	}

	return flashcards;
}
