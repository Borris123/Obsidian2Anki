import {
	requestUrl,
} from "obsidian";

import {
	AnkiResponse,
} from "./anki-response";

import {
	Flashcard,
} from "../flashcards/flashcard";

import {
	AnkiNote,
} from "./anki-note";

import type {
	DuplicateHandling,
} from "./duplicate-handling";

export class AnkiClient {

	constructor(
		private readonly url: string,
	) {}

	private async invoke<T>(
		action: string,
		params: Record<string, unknown> = {},
	): Promise<T> {

		const response =
			await requestUrl({
				url: this.url,
				method: "POST",
				contentType: "application/json",
				body: JSON.stringify({
					action,
					version: 6,
					params,
				}),
			});

		const data =
			response.json as AnkiResponse<T>;

		if (data.error !== null) {
			throw new Error(
				data.error,
			);
		}

		return data.result;
	}

	async getDeckNames():
		Promise<string[]> {

		return this.invoke<string[]>(
			"deckNames",
		);
	}

	async createDeck(
		deckName: string,
	): Promise<number> {

		return this.invoke<number>(
			"createDeck",
			{
				deck: deckName,
			},
		);
	}

	async addFlashcards(
		deckName: string,
		flashcards: Flashcard[],
		duplicateHandling:
		DuplicateHandling,
	): Promise<(number | null)[]> {

		const allowDuplicate =
			duplicateHandling === "add";

		const notes =
			flashcards.map(
				flashcard => ({
					deckName,

					modelName:
						"Basic",

					fields: {
						Front:
						flashcard.front,

						Back:
						flashcard.back,
					},

					options: {
						allowDuplicate,

						duplicateScope:
							"deck",

						duplicateScopeOptions: {
							deckName,

							checkChildren:
								false,

							checkAllModels:
								false,
						},
					},

					tags: [
						"obsidian",
					],
				}),
			);

		return this.invoke<
			(number | null)[]
		>(
			"addNotes",
			{
				notes,
			},
		);
	}

	async updateFlashcard(
		noteId: number,
		flashcard: Flashcard,
	): Promise<void> {

		await this.invoke<null>(
			"updateNoteFields",
			{
				note: {
					id: noteId,

					fields: {
						Front:
						flashcard.front,

						Back:
						flashcard.back,
					},
				},
			},
		);
	}

	async getNotes(
		noteIds: number[],
	): Promise<AnkiNote[]> {

		return this.invoke<
			AnkiNote[]
		>(
			"notesInfo",
			{
				notes: noteIds,
			},
		);
	}
}
