import {
	parseAnkiNoteId,
	parseFlashcardLine,
} from "./flashcard-parser";

export function addAnkiNoteIdsToMarkdown(
	markdown: string,
	noteIds: (number | null)[],
): string {

	const lines =
		markdown.split("\n");

	const output: string[] = [];

	let noteIdIndex = 0;

	let pendingExistingId = false;

	for (const line of lines) {

		const existingId =
			parseAnkiNoteId(line);

		if (existingId !== undefined) {
			pendingExistingId = true;

			output.push(line);

			continue;
		}

		if (!line.trim()) {
			output.push(line);

			continue;
		}

		const flashcard =
			parseFlashcardLine(line);

		if (!flashcard) {
			pendingExistingId = false;

			output.push(line);

			continue;
		}

		if (!pendingExistingId) {

			const noteId =
				noteIds[noteIdIndex];

			noteIdIndex++;

			if (
				noteId !== null &&
				noteId !== undefined
			) {
				output.push(
					`<!-- anki-note-id:${noteId} -->`,
				);
			}
		}

		output.push(line);

		pendingExistingId = false;
	}

	return output.join("\n");
}
