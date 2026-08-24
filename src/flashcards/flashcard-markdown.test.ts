import {
	describe,
	expect,
	it,
} from "vitest";

import {
	addAnkiNoteIdsToMarkdown,
} from "./flashcard-markdown";

describe("addAnkiNoteIdsToMarkdown", () => {

	it("adds note IDs before new flashcards", () => {
		const markdown =
			`Array :: Collection

Stack :: LIFO`;

		const result =
			addAnkiNoteIdsToMarkdown(
				markdown,
				[100, 200],
			);

		expect(result).toBe(
			`<!-- anki-note-id:100 -->
Array :: Collection

<!-- anki-note-id:200 -->
Stack :: LIFO`,
		);
	});

	it("preserves existing note IDs", () => {
		const markdown =
			`<!-- anki-note-id:100 -->
Array :: Collection`;

		const result =
			addAnkiNoteIdsToMarkdown(
				markdown,
				[],
			);

		expect(result).toBe(markdown);
	});

	it("only assigns IDs to new flashcards", () => {
		const markdown =
			`<!-- anki-note-id:100 -->
Array :: Collection

Stack :: LIFO

<!-- anki-note-id:300 -->
Queue :: FIFO`;

		const result =
			addAnkiNoteIdsToMarkdown(
				markdown,
				[200],
			);

		expect(result).toBe(
			`<!-- anki-note-id:100 -->
Array :: Collection

<!-- anki-note-id:200 -->
Stack :: LIFO

<!-- anki-note-id:300 -->
Queue :: FIFO`,
		);
	});

	it("does not add metadata when Anki returns null", () => {
		const markdown =
			`Array :: Collection`;

		const result =
			addAnkiNoteIdsToMarkdown(
				markdown,
				[null],
			);

		expect(result).toBe(markdown);
	});

	it("continues assigning IDs after a failed creation", () => {
		const markdown =
			`Array :: Collection

Stack :: LIFO`;

		const result =
			addAnkiNoteIdsToMarkdown(
				markdown,
				[null, 200],
			);

		expect(result).toBe(
			`Array :: Collection

<!-- anki-note-id:200 -->
Stack :: LIFO`,
		);
	});

	it("keeps regular Markdown unchanged", () => {
		const markdown =
			`# Arrays

Some normal text.

Array :: Collection

## End`;

		const result =
			addAnkiNoteIdsToMarkdown(
				markdown,
				[100],
			);

		expect(result).toBe(
			`# Arrays

Some normal text.

<!-- anki-note-id:100 -->
Array :: Collection

## End`,
		);
	});

	it("preserves trailing newlines", () => {
		const markdown =
			"Array :: Collection\n";

		const result =
			addAnkiNoteIdsToMarkdown(
				markdown,
				[100],
			);

		expect(result).toBe(
			"<!-- anki-note-id:100 -->\n" +
			"Array :: Collection\n",
		);
	});

	it("does not treat a flashcard as linked when unrelated content follows the ID", () => {
		const markdown =
			`<!-- anki-note-id:100 -->
# Heading

Array :: Collection`;

		const result =
			addAnkiNoteIdsToMarkdown(
				markdown,
				[200],
			);

		expect(result).toBe(
			`<!-- anki-note-id:100 -->
# Heading

<!-- anki-note-id:200 -->
Array :: Collection`,
		);
	});
});
