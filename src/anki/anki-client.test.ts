import {beforeEach, describe, expect, it, vi,} from "vitest";
import {requestUrl,} from "obsidian";

import {AnkiClient,} from "./anki-client";

vi.mock("obsidian", () => ({
	requestUrl: vi.fn(),
}));

function mockAnkiResponse(result: unknown, error: string | null = null,): void {

	vi.mocked(requestUrl)
		.mockResolvedValue({
			json: {
				result, error,
			},
		} as Awaited<ReturnType<typeof requestUrl>>);
}

function getRequestBody(): Record<string, unknown> {
	const request = vi.mocked(requestUrl).mock.calls[0]?.[0];

	if (request === undefined) {
		throw new Error("requestUrl was not called");
	}

	if (typeof request === "string") {
		throw new Error("Expected RequestUrlParam");
	}

	if (request.body === undefined) {
		return {};
	}

	if (typeof request.body !== "string") {
		throw new Error("Expected request body to be a string");
	}

	return JSON.parse(request.body) as Record<string, unknown>;
}

describe("AnkiClient", () => {

	beforeEach(() => {
		vi.mocked(requestUrl)
			.mockReset();
	});

	it("requests deck names", async () => {
		mockAnkiResponse(["Default", "Computer Science",]);

		const client = new AnkiClient("http://127.0.0.1:8765",);

		const result = await client.getDeckNames();

		expect(result).toEqual(["Default", "Computer Science",]);

		expect(getRequestBody(),).toEqual({
			action: "deckNames", version: 6, params: {},
		});
	});

	it("creates a deck", async () => {
		mockAnkiResponse(123);

		const client = new AnkiClient("http://127.0.0.1:8765",);

		const result = await client.createDeck("Algorithms",);

		expect(result).toBe(123);

		expect(getRequestBody(),).toEqual({
			action: "createDeck", version: 6, params: {
				deck: "Algorithms",
			},
		});
	});

	it("creates flashcards using addNotes", async () => {
		mockAnkiResponse([100, 200,]);

		const client = new AnkiClient("http://127.0.0.1:8765",);

		const result = await client.addFlashcards("Algorithms", [{
			front: "Binary Search", back: "O(log n)",
		}, {
			front: "Linear Search", back: "O(n)",
		},], "skip",);

		expect(result).toEqual([100, 200,]);

		expect(getRequestBody(),).toEqual({
			action: "addNotes", version: 6,

			params: {
				notes: [{
					deckName: "Algorithms", modelName: "Basic",

					fields: {
						Front: "Binary Search", Back: "O(log n)",
					},

					options: {
						allowDuplicate: false, duplicateScope: "deck",

						duplicateScopeOptions: {
							deckName: "Algorithms", checkChildren: false, checkAllModels: false,
						},
					},

					tags: ["obsidian",],
				}, {
					deckName: "Algorithms", modelName: "Basic",

					fields: {
						Front: "Linear Search", Back: "O(n)",
					},

					options: {
						allowDuplicate: false, duplicateScope: "deck",

						duplicateScopeOptions: {
							deckName: "Algorithms", checkChildren: false, checkAllModels: false,
						},
					},

					tags: ["obsidian",],
				},],
			},
		});
	});

	it("loads notes using notesInfo", async () => {
		const notes = [{
			noteId: 123,

			fields: {
				Front: {
					value: "Array", order: 0,
				},

				Back: {
					value: "Collection", order: 1,
				},
			},

			tags: [],
		},];

		mockAnkiResponse(notes);

		const client = new AnkiClient("http://127.0.0.1:8765",);

		const result = await client.getNotes([123],);

		expect(result).toEqual(notes);

		expect(getRequestBody(),).toEqual({
			action: "notesInfo", version: 6,

			params: {
				notes: [123,],
			},
		});
	});

	it("updates an existing flashcard", async () => {
		mockAnkiResponse(null);

		const client = new AnkiClient("http://127.0.0.1:8765",);

		await client.updateFlashcard(123, {
			front: "Array", back: "Contiguous collection", ankiNoteId: 123,
		},);

		expect(getRequestBody(),).toEqual({
			action: "updateNoteFields", version: 6,

			params: {
				note: {
					id: 123,

					fields: {
						Front: "Array", Back: "Contiguous collection",
					},
				},
			},
		});
	});

	it("uses the configured AnkiConnect URL", async () => {
		mockAnkiResponse([]);

		const client = new AnkiClient("http://localhost:9999",);

		await client.getDeckNames();

		expect(vi.mocked(requestUrl),).toHaveBeenCalledWith(expect.objectContaining({
			url: "http://localhost:9999",
		}),);
	});

	it("throws when AnkiConnect returns an error", async () => {
		mockAnkiResponse(null, "Anki error",);

		const client = new AnkiClient("http://127.0.0.1:8765",);

		await expect(client.getDeckNames(),).rejects.toThrow("Anki error",);
	});
});
