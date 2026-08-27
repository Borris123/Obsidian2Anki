import {
	describe,
	expect,
	it,
	vi,
} from "vitest";

import {
	parseFlashcards,
} from "../../src/flashcards/flashcard-parser";

import type {
	AnkiNote,
} from "../../src/anki/anki-note";

import {
	syncFlashcards,
} from "../../src/sync/sync-flashcards";

import type {
	FlashcardSyncClient,
} from "../../src/sync/sync-flashcards";


function createMockClient() {

	const client = {
		getNotes:
			vi.fn<
				FlashcardSyncClient["getNotes"]
			>(),

		updateFlashcard:
			vi.fn<
				FlashcardSyncClient["updateFlashcard"]
			>(),

		addFlashcards:
			vi.fn<
				FlashcardSyncClient["addFlashcards"]
			>(),
	} satisfies FlashcardSyncClient;

	client.getNotes
		.mockResolvedValue([]);

	client.updateFlashcard
		.mockResolvedValue(
			undefined,
		);

	client.addFlashcards
		.mockResolvedValue([]);

	return client;
}


function createAnkiNote(
	noteId: number,
	front: string,
	back: string,
): AnkiNote {

	return {
		noteId,

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

		tags: [
			"obsidian",
		],
	};
}


describe("smart sync integration", () => {

	const deckName =
		"Computer Science";

	it("creates new flashcards and writes their Anki IDs to Markdown", async () => {

		const markdown =
			`Array :: Collection of elements

Stack :: LIFO`;

		const flashcards =
			parseFlashcards(
				markdown,
			);

		const client =
			createMockClient();

		client.addFlashcards
			.mockResolvedValue([
				100,
				200,
			]);

		const result =
			await syncFlashcards(
				client,
				deckName,
				markdown,
				flashcards,
				"skip",
			);

		expect(result.created)
			.toBe(2);

		expect(result.updated)
			.toBe(0);

		expect(result.unchanged)
			.toBe(0);

		expect(result.missing)
			.toBe(0);

		expect(
			result.updatedMarkdown,
		).toBe(
			`<!-- anki-note-id:100 -->
Array :: Collection of elements

<!-- anki-note-id:200 -->
Stack :: LIFO`,
		);

		expect(
			client.addFlashcards,
		).toHaveBeenCalledWith(
			"Computer Science",
			flashcards,
		);

		expect(
			client.updateFlashcard,
		).not.toHaveBeenCalled();
	});


	it("skips unchanged existing flashcards", async () => {

		const markdown =
			`<!-- anki-note-id:100 -->
Array :: Collection of elements`;

		const flashcards =
			parseFlashcards(
				markdown,
			);

		const client =
			createMockClient();

		client.getNotes
			.mockResolvedValue([
				createAnkiNote(
					100,
					"Array",
					"Collection of elements",
				),
			]);

		const result =
			await syncFlashcards(
				client,
				deckName,
				markdown,
				flashcards,
				"skip",
			);

		expect(result.created)
			.toBe(0);

		expect(result.updated)
			.toBe(0);

		expect(result.unchanged)
			.toBe(1);

		expect(result.missing)
			.toBe(0);

		expect(
			result.updatedMarkdown,
		).toBe(markdown);

		expect(
			client.updateFlashcard,
		).not.toHaveBeenCalled();

		expect(
			client.addFlashcards,
		).not.toHaveBeenCalled();
	});


	it("updates an existing flashcard when the back changed", async () => {

		const markdown =
			`<!-- anki-note-id:100 -->
Array :: Contiguous collection`;

		const flashcards =
			parseFlashcards(
				markdown,
			);

		const client =
			createMockClient();

		client.getNotes
			.mockResolvedValue([
				createAnkiNote(
					100,
					"Array",
					"Collection of elements",
				),
			]);

		const result =
			await syncFlashcards(
				client,
				deckName,
				markdown,
				flashcards,
				"skip",
			);

		expect(result.created)
			.toBe(0);

		expect(result.updated)
			.toBe(1);

		expect(result.unchanged)
			.toBe(0);

		expect(
			client.updateFlashcard,
		).toHaveBeenCalledWith(
			100,
			{
				front:
					"Array",

				back:
					"Contiguous collection",

				ankiNoteId:
					100,
			},
		);

		expect(
			result.updatedMarkdown,
		).toBe(markdown);
	});


	it("handles new, changed and unchanged flashcards in one sync", async () => {

		const markdown =
			`<!-- anki-note-id:100 -->
Array :: Updated collection

<!-- anki-note-id:200 -->
Stack :: LIFO

Queue :: FIFO`;

		const flashcards =
			parseFlashcards(
				markdown,
			);

		const client =
			createMockClient();

		client.getNotes
			.mockResolvedValue([
				createAnkiNote(
					100,
					"Array",
					"Old collection",
				),

				createAnkiNote(
					200,
					"Stack",
					"LIFO",
				),
			]);

		client.addFlashcards
			.mockResolvedValue([
				300,
			]);

		const result =
			await syncFlashcards(
				client,
				deckName,
				markdown,
				flashcards,
				"skip",
			);

		expect(result.created)
			.toBe(1);

		expect(result.updated)
			.toBe(1);

		expect(result.unchanged)
			.toBe(1);

		expect(result.missing)
			.toBe(0);

		expect(
			client.updateFlashcard,
		).toHaveBeenCalledWith(
			100,
			expect.objectContaining({
				front:
					"Array",

				back:
					"Updated collection",
			}),
		);

		expect(
			result.updatedMarkdown,
		).toContain(
			"<!-- anki-note-id:300 -->\n" +
			"Queue :: FIFO",
		);
	});
});
