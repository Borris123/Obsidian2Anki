import { AnkiNote } from "../anki/anki-note";
import { Flashcard } from "./flashcard";

export function hasFlashcardChanged(
	flashcard: Flashcard,
	ankiNote: AnkiNote,
): boolean {

	return (
		flashcard.front !==
		ankiNote.fields.Front.value
		||
		flashcard.back !==
		ankiNote.fields.Back.value
	);
}
