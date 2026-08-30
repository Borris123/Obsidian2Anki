import {describe, expect, it, vi} from "vitest";

import type {AnkiNote} from "../anki/anki-note";
import type {Flashcard} from "../flashcards/flashcard";
import type {FlashcardSyncClient} from "./sync-flashcards";
import {syncFlashcards} from "./sync-flashcards";


function createMockClient() {
	const client = {
		getNotes: vi.fn<FlashcardSyncClient["getNotes"]>(),
		updateFlashcard: vi.fn<FlashcardSyncClient["updateFlashcard"]>(),
		addFlashcards: vi.fn<FlashcardSyncClient["addFlashcards"]>()
	} satisfies FlashcardSyncClient;

	client.getNotes.mockResolvedValue([]);
	client.updateFlashcard.mockResolvedValue(undefined);
	client.addFlashcards.mockResolvedValue([]);

	return client;
}


function createAnkiNote(noteId: number, front: string, back: string): AnkiNote {
	return {
		noteId, fields: {
			Front: {value: front, order: 0}, Back: {value: back, order: 1}
		}, tags: []
	};
}


describe("syncFlashcards", () => {
	const deckName = "Computer Science";

	it("returns an empty result when there are no flashcards", async () => {
		const client = createMockClient();

		const result = await syncFlashcards(client, deckName, "", [], "skip");

		expect(result).toEqual({
			created: 0, updated: 0, unchanged: 0, missing: 0, updatedMarkdown: ""
		});

		expect(client.getNotes).not.toHaveBeenCalled();
		expect(client.updateFlashcard).not.toHaveBeenCalled();
		expect(client.addFlashcards).not.toHaveBeenCalled();
	});


	it("creates new flashcards and writes their Anki note IDs to Markdown", async () => {
		const markdown = ["Array :: Collection of elements", "", "Stack :: LIFO"].join("\n");

		const flashcards: Flashcard[] = [{front: "Array", back: "Collection of elements"}, {
			front: "Stack", back: "LIFO"
		}];

		const client = createMockClient();
		client.addFlashcards.mockResolvedValue([100, 200]);

		const result = await syncFlashcards(client, deckName, markdown, flashcards, "skip");

		const expectedMarkdown = ["<!-- anki-note-id:100 -->", "Array :: Collection of elements", "", "<!-- anki-note-id:200 -->", "Stack :: LIFO"].join("\n");

		expect(result).toEqual({
			created: 2, updated: 0, unchanged: 0, missing: 0, updatedMarkdown: expectedMarkdown
		});

		expect(client.getNotes).not.toHaveBeenCalled();
		expect(client.addFlashcards).toHaveBeenCalledWith(deckName, flashcards, "skip");
	});


	it("does not add an Anki note ID when creation returns null", async () => {
		const markdown = ["Array :: Collection", "", "Stack :: LIFO"].join("\n");

		const flashcards: Flashcard[] = [{front: "Array", back: "Collection"}, {front: "Stack", back: "LIFO"}];

		const client = createMockClient();
		client.addFlashcards.mockResolvedValue([100, null]);

		const result = await syncFlashcards(client, deckName, markdown, flashcards, "skip");

		const expectedMarkdown = ["<!-- anki-note-id:100 -->", "Array :: Collection", "", "Stack :: LIFO"].join("\n");

		expect(result.created).toBe(1);
		expect(result.missing).toBe(0);
		expect(result.updatedMarkdown).toBe(expectedMarkdown);
	});


	it("marks an existing flashcard as unchanged when front and back are equal", async () => {
		const markdown = ["<!-- anki-note-id:100 -->", "Array :: Collection of elements"].join("\n");

		const flashcard: Flashcard = {
			ankiNoteId: 100, front: "Array", back: "Collection of elements"
		};

		const client = createMockClient();
		client.getNotes.mockResolvedValue([createAnkiNote(100, "Array", "Collection of elements")]);

		const result = await syncFlashcards(client, deckName, markdown, [flashcard], "skip");

		expect(result).toEqual({
			created: 0, updated: 0, unchanged: 1, missing: 0, updatedMarkdown: markdown
		});

		expect(client.getNotes).toHaveBeenCalledWith([100]);
		expect(client.updateFlashcard).not.toHaveBeenCalled();
		expect(client.addFlashcards).not.toHaveBeenCalled();
	});


	it("updates an existing flashcard when it changed", async () => {
		const markdown = ["<!-- anki-note-id:100 -->", "Array :: Contiguous collection"].join("\n");

		const flashcard: Flashcard = {
			ankiNoteId: 100, front: "Array", back: "Contiguous collection"
		};

		const client = createMockClient();
		client.getNotes.mockResolvedValue([createAnkiNote(100, "Array", "Old collection")]);

		const result = await syncFlashcards(client, deckName, markdown, [flashcard], "skip");

		expect(result).toEqual({
			created: 0, updated: 1, unchanged: 0, missing: 0, updatedMarkdown: markdown
		});

		expect(client.updateFlashcard).toHaveBeenCalledWith(100, flashcard);
		expect(client.addFlashcards).not.toHaveBeenCalled();
	});


	it("recreates an orphaned flashcard and replaces its old Anki note ID", async () => {
		const markdown = ["<!-- anki-note-id:100 -->", "Array :: Collection"].join("\n");

		const flashcard: Flashcard = {
			ankiNoteId: 100, front: "Array", back: "Collection"
		};

		const client = createMockClient();
		client.getNotes.mockResolvedValue([]);
		client.addFlashcards.mockResolvedValue([200]);

		const result = await syncFlashcards(client, deckName, markdown, [flashcard], "skip");

		const expectedMarkdown = ["<!-- anki-note-id:200 -->", "Array :: Collection"].join("\n");

		expect(result).toEqual({
			created: 1, updated: 0, unchanged: 0, missing: 0, updatedMarkdown: expectedMarkdown
		});

		expect(client.addFlashcards).toHaveBeenCalledWith(deckName, [flashcard], "skip");
	});


	it("removes the old Anki note ID when an orphaned flashcard cannot be recreated", async () => {
		const markdown = ["<!-- anki-note-id:100 -->", "Array :: Collection"].join("\n");

		const flashcard: Flashcard = {
			ankiNoteId: 100, front: "Array", back: "Collection"
		};

		const client = createMockClient();
		client.getNotes.mockResolvedValue([]);
		client.addFlashcards.mockResolvedValue([null]);

		const result = await syncFlashcards(client, deckName, markdown, [flashcard], "skip");

		expect(result).toEqual({
			created: 0, updated: 0, unchanged: 0, missing: 1, updatedMarkdown: "Array :: Collection"
		});
	});


	it("handles new, changed, unchanged and orphaned flashcards in one sync", async () => {
		const markdown = ["Queue :: FIFO", "", "<!-- anki-note-id:100 -->", "Array :: Updated collection", "", "<!-- anki-note-id:200 -->", "Stack :: LIFO", "", "<!-- anki-note-id:300 -->", "Tree :: Hierarchical structure"].join("\n");

		const newFlashcard: Flashcard = {
			front: "Queue", back: "FIFO"
		};

		const changedFlashcard: Flashcard = {
			ankiNoteId: 100, front: "Array", back: "Updated collection"
		};

		const unchangedFlashcard: Flashcard = {
			ankiNoteId: 200, front: "Stack", back: "LIFO"
		};

		const orphanedFlashcard: Flashcard = {
			ankiNoteId: 300, front: "Tree", back: "Hierarchical structure"
		};

		const flashcards = [newFlashcard, changedFlashcard, unchangedFlashcard, orphanedFlashcard];

		const client = createMockClient();

		client.getNotes.mockResolvedValue([createAnkiNote(100, "Array", "Old collection"), createAnkiNote(200, "Stack", "LIFO")]);

		client.addFlashcards.mockResolvedValue([400, 500]);

		const result = await syncFlashcards(client, deckName, markdown, flashcards, "skip");

		const expectedMarkdown = ["<!-- anki-note-id:400 -->", "Queue :: FIFO", "", "<!-- anki-note-id:100 -->", "Array :: Updated collection", "", "<!-- anki-note-id:200 -->", "Stack :: LIFO", "", "<!-- anki-note-id:500 -->", "Tree :: Hierarchical structure"].join("\n");

		expect(result.created).toBe(2);
		expect(result.updated).toBe(1);
		expect(result.unchanged).toBe(1);
		expect(result.missing).toBe(0);

		expect(client.getNotes).toHaveBeenCalledWith([100, 200, 300]);
		expect(client.updateFlashcard).toHaveBeenCalledWith(100, changedFlashcard);
		expect(client.addFlashcards).toHaveBeenCalledWith(deckName, [newFlashcard, orphanedFlashcard], "skip");

		expect(result.updatedMarkdown).toBe(expectedMarkdown);
	});


	it("passes duplicate handling to the client", async () => {
		const markdown = "Array :: Collection";
		const flashcard: Flashcard = {
			front: "Array", back: "Collection"
		};

		const client = createMockClient();
		client.addFlashcards.mockResolvedValue([100]);

		await syncFlashcards(client, deckName, markdown, [flashcard], "add");

		expect(client.addFlashcards).toHaveBeenCalledWith(deckName, [flashcard], "add");
	});
});
