import { Flashcard } from "./flashcard";

const FLASHCARD_SEPARATOR = ' :: '

export function parseFlashcards(markdown: string): Flashcard[] {
	const flashcards: Flashcard[] = [];

	for (const line of markdown.split('\n')) {
		const separatorIndex = line.indexOf(FLASHCARD_SEPARATOR);

		if (separatorIndex === -1) {
			continue;
		}

		const front = line.substring(0, separatorIndex).trim();

		const back = line
			.substring(separatorIndex + FLASHCARD_SEPARATOR.length)
			.trim();

		if (!front || !back) {
			continue;
		}

		flashcards.push({
			front,
			back,
		});
	}

	return flashcards;
}
