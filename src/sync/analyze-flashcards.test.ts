import {describe, expect, it, vi} from "vitest";
import {analyzeFlashcards, FlashcardAnalysisClient} from "./analyze-flashcards";
import {AnkiNote} from "../anki/anki-note";
import {Flashcard} from "../flashcards/flashcard";

function createMockClient() {
	const client = {
		getNotes: vi.fn<FlashcardAnalysisClient["getNotes"]>(),
		canAddFlashcards: vi.fn<FlashcardAnalysisClient["canAddFlashcards"]>(),
	} satisfies FlashcardAnalysisClient;

	client.getNotes.mockResolvedValue([]);
	client.canAddFlashcards.mockResolvedValue([]);

	return client;
}

function createAnkiNote(noteId: number, front: string, back: string): AnkiNote {
	return {
		noteId, fields: {
			Front: {
				value: front, order: 0,
			}, Back: {
				value: back, order: 1,
			},
		}, tags: [],
	};
}

describe('analyzeFlashcards', () => {
	const deckName = 'Computer Science';

	it("returns an empty sync plan when there are no flashcards", async () => {
		const client = createMockClient();

		const result = await analyzeFlashcards(client, deckName, [], "skip",);

		expect(result).toEqual({deckName, duplicateHandling: "skip", operations: [],});
		expect(client.getNotes).not.toHaveBeenCalled();
		expect(client.canAddFlashcards).not.toHaveBeenCalled();
	});

	it("creates new flashcards when they can be added", async () => {
		const flashcard: Flashcard = {
			front: "What is an array?", back: "A contiguous collection of elements.",
		};

		const client = createMockClient();

		client.canAddFlashcards.mockResolvedValue([true]);

		const result = await analyzeFlashcards(client, deckName, [flashcard], "skip");

		expect(client.getNotes).not.toHaveBeenCalled();
		expect(client.canAddFlashcards).toHaveBeenCalledWith(deckName, [flashcard], "skip");
		expect(result.operations).toEqual([{type: "create", flashcard}]);
	});

	it("skips new flashcards when they are duplicates", async () => {
		const flashcard: Flashcard = {
			front: "What is an array?", back: "A contiguous collection of elements.",
		};

		const client = createMockClient();

		client.canAddFlashcards.mockResolvedValue([false]);

		const result = await analyzeFlashcards(client, deckName, [flashcard], "skip");

		expect(result.operations).toEqual([{type: "skip", flashcard, reason: "duplicate"}]);
	});


	it("marks an existing unchanged flashcard as unchanged", async () => {
		const flashcard: Flashcard = {
			ankiNoteId: 100, front: "Array", back: "Collection of elements",
		};

		const client = createMockClient();

		client.getNotes.mockResolvedValue([createAnkiNote(100, "Array", "Collection of elements")]);

		const result = await analyzeFlashcards(client, deckName, [flashcard], "skip",);

		expect(client.getNotes).toHaveBeenCalledWith([100]);
		expect(client.canAddFlashcards).not.toHaveBeenCalled();
		expect(result.operations).toEqual([{type: "unchanged", flashcard, noteId: 100}]);
	});


	it("marks a changed existing flashcard for update", async () => {
		const flashcard: Flashcard = {
			ankiNoteId: 100, front: "What is an array?", back: "A contiguous collection of elements.",
		};

		const client = createMockClient();

		client.getNotes.mockResolvedValue([createAnkiNote(100, "Array", "Collection of elements")]);

		const result = await analyzeFlashcards(client, deckName, [flashcard], "skip",);

		expect(client.canAddFlashcards).not.toHaveBeenCalled();
		expect(result.operations).toEqual([{
			type: "update", flashcard, noteId: 100, previousFront: "Array", previousBack: "Collection of elements"
		}]);
	});


	it("creates a flashcard again when its referenced Anki note no longer exists", async () => {
		const flashcard: Flashcard = {
			ankiNoteId: 100, front: "Array", back: "Collection of elements",
		};

		const client = createMockClient();

		client.getNotes
			.mockResolvedValue([]);

		client.canAddFlashcards
			.mockResolvedValue([true]);

		const result = await analyzeFlashcards(client, deckName, [flashcard], "skip");

		expect(client.getNotes).toHaveBeenCalledWith([100]);
		expect(client.canAddFlashcards).toHaveBeenCalledWith(deckName, [flashcard], "skip");
		expect(result.operations).toEqual([{type: "create", flashcard, previousNoteId: 100}]);
	});


	it("skips a missing referenced note when recreating it would cause a duplicate", async () => {
		const flashcard: Flashcard = {
			ankiNoteId: 100, front: "Array", back: "Collection of elements",
		};

		const client = createMockClient();

		client.getNotes.mockResolvedValue([]);

		client.canAddFlashcards.mockResolvedValue([false,]);

		const result = await analyzeFlashcards(client, deckName, [flashcard], "skip",);

		expect(result.operations).toEqual([{type: "skip", flashcard, reason: "duplicate", previousNoteId: 100}]);
	});


	it("handles create, update, unchanged and skip operations together while preserving order", async () => {
		const newFlashcard: Flashcard = {
			front: "Queue", back: "FIFO",
		};

		const unchangedFlashcard: Flashcard = {
			ankiNoteId: 100, front: "Stack", back: "LIFO",
		};

		const changedFlashcard: Flashcard = {
			ankiNoteId: 200, front: "Array", back: "Contiguous collection",
		};

		const missingFlashcard: Flashcard = {
			ankiNoteId: 300, front: "Linked List", back: "Nodes connected by references",
		};

		const duplicateFlashcard: Flashcard = {
			front: "Tree", back: "Hierarchical data structure",
		};

		const flashcards = [newFlashcard, unchangedFlashcard, changedFlashcard, missingFlashcard, duplicateFlashcard,];

		const client = createMockClient();

		client.getNotes.mockResolvedValue([createAnkiNote(100, "Stack", "LIFO"), createAnkiNote(200, "Array", "Old collection")]);

		client.canAddFlashcards.mockResolvedValue([true, true, false]);

		const result = await analyzeFlashcards(client, deckName, flashcards, "skip",);

		expect(client.getNotes).toHaveBeenCalledWith([100, 200, 300]);
		expect(client.canAddFlashcards).toHaveBeenCalledWith(deckName, [newFlashcard, missingFlashcard, duplicateFlashcard], "skip");
		expect(result).toEqual({
			deckName, duplicateHandling: "skip",
			operations: [{
				type: "create", flashcard: newFlashcard,
			},
			{
				type: "unchanged", flashcard: unchangedFlashcard, noteId: 100,
			},
			{
				type: "update",
				flashcard: changedFlashcard,
				noteId: 200,
				previousFront: "Array",
				previousBack: "Old collection",
			},
			{
				type: "create", flashcard: missingFlashcard, previousNoteId: 300,
			},
			{
				type: "skip", flashcard: duplicateFlashcard, reason: "duplicate",
			}]
		});
	});


	it("treats missing canAdd results as false", async () => {
		const firstFlashcard: Flashcard = {
			front: "Array", back: "Collection",
		};

		const secondFlashcard: Flashcard = {
			front: "Stack", back: "LIFO",
		};

		const client = createMockClient();

		client.canAddFlashcards.mockResolvedValue([true]);

		const result = await analyzeFlashcards(client, deckName, [firstFlashcard, secondFlashcard,], "skip",);

		expect(result.operations)
			.toEqual([{
				type: "create", flashcard: firstFlashcard,
			},
			{
				type: "skip", flashcard: secondFlashcard, reason: "duplicate",
			}]);
	});
})
