import {
	describe,
	expect,
	it,
} from "vitest";

import {
	parseAnkiNoteId,
	parseFlashcardLine,
	parseFlashcards,
} from "./flashcard-parser";

describe("parseFlashcardLine", () => {

	it("parses a valid flashcard", () => {
		expect(
			parseFlashcardLine(
				"Array :: Collection of elements",
			),
		).toEqual({
			front: "Array",
			back: "Collection of elements",
		});
	});

	it("trims front and back", () => {
		expect(
			parseFlashcardLine(
				"   Array :: Collection   ",
			),
		).toEqual({
			front: "Array",
			back: "Collection",
		});
	});

	it("returns null when separator is missing", () => {
		expect(
			parseFlashcardLine(
				"Array Collection",
			),
		).toBeNull();
	});

	it("returns null when front is empty", () => {
		expect(
			parseFlashcardLine(
				" :: Collection",
			),
		).toBeNull();
	});

	it("returns null when back is empty", () => {
		expect(
			parseFlashcardLine(
				"Array :: ",
			),
		).toBeNull();
	});

	it("uses the first separator", () => {
		expect(
			parseFlashcardLine(
				"Question :: Answer :: Additional information",
			),
		).toEqual({
			front: "Question",
			back: "Answer :: Additional information",
		});
	});

	it("does not interpret C++ scope operators as flashcards", () => {
		expect(
			parseFlashcardLine(
				"std::vector<int> values;",
			),
		).toBeNull();
	});
});

describe("parseAnkiNoteId", () => {

	it("parses a valid Anki note ID", () => {
		expect(
			parseAnkiNoteId(
				"<!-- anki-note-id:123456 -->",
			),
		).toBe(123456);
	});

	it("allows whitespace around the metadata", () => {
		expect(
			parseAnkiNoteId(
				"   <!-- anki-note-id:123456 -->   ",
			),
		).toBe(123456);
	});

	it("returns undefined for non numeric IDs", () => {
		expect(
			parseAnkiNoteId(
				"<!-- anki-note-id:abc -->",
			),
		).toBeUndefined();
	});

	it("returns undefined for malformed metadata", () => {
		expect(
			parseAnkiNoteId(
				"anki-note-id:123",
			),
		).toBeUndefined();
	});

	it("does not accept metadata embedded in other text", () => {
		expect(
			parseAnkiNoteId(
				"hello <!-- anki-note-id:123 -->",
			),
		).toBeUndefined();
	});
});

describe("parseFlashcards", () => {

	it("parses multiple flashcards", () => {
		const markdown = `
# Arrays

Array :: Collection of elements

Stack :: LIFO
`;

		expect(
			parseFlashcards(markdown),
		).toEqual([
			{
				front: "Array",
				back: "Collection of elements",
				ankiNoteId: undefined,
			},
			{
				front: "Stack",
				back: "LIFO",
				ankiNoteId: undefined,
			},
		]);
	});

	it("ignores regular markdown", () => {
		const markdown = `
# Arrays

This is normal text.

Array :: Collection
`;

		expect(
			parseFlashcards(markdown),
		).toEqual([
			{
				front: "Array",
				back: "Collection",
				ankiNoteId: undefined,
			},
		]);
	});

	it("assigns an Anki note ID to the following flashcard", () => {
		const markdown = `
<!-- anki-note-id:123 -->
Array :: Collection
`;

		expect(
			parseFlashcards(markdown),
		).toEqual([
			{
				front: "Array",
				back: "Collection",
				ankiNoteId: 123,
			},
		]);
	});

	it("allows blank lines between ID and flashcard", () => {
		const markdown = `
<!-- anki-note-id:123 -->

Array :: Collection
`;

		expect(
			parseFlashcards(markdown),
		).toEqual([
			{
				front: "Array",
				back: "Collection",
				ankiNoteId: 123,
			},
		]);
	});

	it("only assigns the ID to one flashcard", () => {
		const markdown = `
<!-- anki-note-id:123 -->
Array :: Collection

Stack :: LIFO
`;

		expect(
			parseFlashcards(markdown),
		).toEqual([
			{
				front: "Array",
				back: "Collection",
				ankiNoteId: 123,
			},
			{
				front: "Stack",
				back: "LIFO",
				ankiNoteId: undefined,
			},
		]);
	});

	it("resets a pending ID when unrelated content occurs", () => {
		const markdown = `
<!-- anki-note-id:123 -->
# Arrays

Array :: Collection
`;

		expect(
			parseFlashcards(markdown),
		).toEqual([
			{
				front: "Array",
				back: "Collection",
				ankiNoteId: undefined,
			},
		]);
	});

	it("supports mixed linked and new flashcards", () => {
		const markdown = `
<!-- anki-note-id:100 -->
Array :: Collection

Stack :: LIFO

<!-- anki-note-id:300 -->
Queue :: FIFO
`;

		expect(
			parseFlashcards(markdown),
		).toEqual([
			{
				front: "Array",
				back: "Collection",
				ankiNoteId: 100,
			},
			{
				front: "Stack",
				back: "LIFO",
				ankiNoteId: undefined,
			},
			{
				front: "Queue",
				back: "FIFO",
				ankiNoteId: 300,
			},
		]);
	});
});
