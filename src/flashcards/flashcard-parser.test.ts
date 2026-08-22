import {describe, expect, it} from "vitest";
import {parseFlashcards} from "./flashcard-parser";

describe("parseFlashcards", () => {
	it("parses key-value flashcards", () => {
		const markdown = `
# Arrays

Array :: Collection of elements
Index :: Position of an element
`;

		expect(parseFlashcards(markdown)).toEqual([
			{
				front: "Array",
				back: "Collection of elements",
			},
			{
				front: "Index",
				back: "Position of an element",
			},
		]);
	});

	it("ignores regular markdown", () => {
		const markdown = `
# Arrays

This is normal text.

Array :: Collection of elements
`;

		expect(parseFlashcards(markdown)).toHaveLength(1);
	});

	it("ignores empty fronts", () => {
		expect(
			parseFlashcards(" :: Some answer")
		).toEqual([]);
	});

	it("ignores empty backs", () => {
		expect(
			parseFlashcards("Some question :: ")
		).toEqual([]);
	});

	it("does not interpret C++ scope operators as flashcards", () => {
		expect(
			parseFlashcards("std::vector<int> numbers;")
		).toEqual([]);
	});
});
