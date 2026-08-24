import {
	describe,
	expect,
	it,
} from "vitest";

import {
	hasFlashcardChanged,
} from "./flashcard-sync";

import {
	AnkiNote,
} from "../anki/anki-note";

import {
	Flashcard,
} from "./flashcard";

function createAnkiNote(
	front: string,
	back: string,
): AnkiNote {

	return {
		noteId: 123,

		fields: {
			Front: {
				value: front,
				order: 0,
			},

			Back: {
				value: back,
				order: 1,
			},
		},

		tags: [],
	};
}

describe("hasFlashcardChanged", () => {

	it("returns false when front and back are unchanged", () => {
		const flashcard: Flashcard = {
			front: "Array",
			back: "Collection",
			ankiNoteId: 123,
		};

		const ankiNote =
			createAnkiNote(
				"Array",
				"Collection",
			);

		expect(
			hasFlashcardChanged(
				flashcard,
				ankiNote,
			),
		).toBe(false);
	});

	it("detects a changed front", () => {
		const flashcard: Flashcard = {
			front: "What is an array?",
			back: "Collection",
			ankiNoteId: 123,
		};

		const ankiNote =
			createAnkiNote(
				"Array",
				"Collection",
			);

		expect(
			hasFlashcardChanged(
				flashcard,
				ankiNote,
			),
		).toBe(true);
	});

	it("detects a changed back", () => {
		const flashcard: Flashcard = {
			front: "Array",
			back: "Contiguous collection",
			ankiNoteId: 123,
		};

		const ankiNote =
			createAnkiNote(
				"Array",
				"Collection",
			);

		expect(
			hasFlashcardChanged(
				flashcard,
				ankiNote,
			),
		).toBe(true);
	});

	it("detects when both fields changed", () => {
		const flashcard: Flashcard = {
			front: "What is an array?",
			back: "Contiguous collection",
			ankiNoteId: 123,
		};

		const ankiNote =
			createAnkiNote(
				"Array",
				"Collection",
			);

		expect(
			hasFlashcardChanged(
				flashcard,
				ankiNote,
			),
		).toBe(true);
	});
});
