import {
	Notice,
	Plugin,
} from "obsidian";

import {
	AnkiExporterSettings,
	AnkiExporterSettingTab,
	DEFAULT_SETTINGS,
} from "./settings";

import {
	parseFlashcards,
} from "./flashcards/flashcard-parser";

import {
	addAnkiNoteIdsToMarkdown,
} from "./flashcards/flashcard-markdown";

import {
	AnkiClient,
} from "./anki/anki-client";

import {
	AnkiExportModal,
} from "./ui/anki-export-modal";
import {hasFlashcardChanged} from "./flashcards/flashcard-sync";

export default class AnkiExporterPlugin
	extends Plugin {

	settings: AnkiExporterSettings = {
		...DEFAULT_SETTINGS,
	};

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(
			new AnkiExporterSettingTab(
				this.app,
				this,
			),
		);

		this.addRibbonIcon(
			"layers",
			"Export current note to Anki",
			async () => {
				await this.openExportModal();
			},
		);

		this.addCommand({
			id: "export-current-note-to-anki",

			name:
				"Export current note to Anki",

			callback: async () => {
				await this.openExportModal();
			},
		});
	}

	private async openExportModal():
		Promise<void> {

		const file =
			this.app.workspace
				.getActiveFile();

		if (!file) {
			new Notice(
				"No note is currently open.",
			);

			return;
		}

		if (file.extension !== "md") {
			new Notice(
				"The current file is not a Markdown note.",
			);

			return;
		}

		const markdown =
			await this.app.vault
				.cachedRead(file);

		const flashcards =
			parseFlashcards(
				markdown,
			);

		if (flashcards.length === 0) {
			new Notice(
				"No flashcards found in the current note.",
			);

			return;
		}

		const ankiClient =
			new AnkiClient(
				this.settings
					.ankiConnectUrl,
			);

		let decks: string[];

		try {
			decks =
				await ankiClient
					.getDeckNames();

		} catch (error) {
			console.error(
				"Could not connect to Anki:",
				error,
			);

			new Notice(
				"Could not connect to Anki. Is Anki running?",
			);

			return;
		}

		new AnkiExportModal(
			this.app,

			file.basename,

			decks,

			flashcards.length,

			async deckName => {

				const newFlashcards =
					flashcards.filter(
						flashcard =>
							flashcard.ankiNoteId ===
							undefined,
					);

				const existingFlashcards =
					flashcards.filter(
						flashcard =>
							flashcard.ankiNoteId !==
							undefined,
					);

				const existingNoteIds =
					existingFlashcards.map(
						flashcard =>
							flashcard.ankiNoteId!,
					);

				const ankiNotes =
					existingNoteIds.length > 0
						? await ankiClient.getNotes(
							existingNoteIds,
						)
						: [];

				const ankiNotesById =
					new Map(
						ankiNotes.map(
							note => [
								note.noteId,
								note,
							],
						),
					);

				let updatedCount = 0;
				let unchangedCount = 0;
				let missingCount = 0;

				for (
					const flashcard
					of existingFlashcards
					) {

					const noteId =
						flashcard.ankiNoteId!;

					const ankiNote =
						ankiNotesById.get(
							noteId,
						);

					if (!ankiNote) {
						missingCount++;

						continue;
					}

					if (
						!hasFlashcardChanged(
							flashcard,
							ankiNote,
						)
					) {
						unchangedCount++;

						continue;
					}

					await ankiClient
						.updateFlashcard(
							noteId,
							flashcard,
						);

					updatedCount++;
				}

				let createdCount = 0;

				if (newFlashcards.length > 0) {

					const noteIds =
						await ankiClient
							.addFlashcards(
								deckName,
								newFlashcards,
							);

					createdCount =
						noteIds.filter(
							id => id !== null,
						).length;

					const updatedMarkdown =
						addAnkiNoteIdsToMarkdown(
							markdown,
							noteIds,
						);

					await this.app.vault.modify(
						file,
						updatedMarkdown,
					);
				}

				let message =
					`Sync complete: ` +
					`${createdCount} created, ` +
					`${updatedCount} updated, ` +
					`${unchangedCount} unchanged`;

				if (missingCount > 0) {
					message +=
						`, ${missingCount} missing`;
				}

				message += ".";

				new Notice(
					message,
				);
			},

			async deckName => {
				await ankiClient
					.createDeck(
						deckName,
					);
			},

		).open();
	}

	async loadSettings(): Promise<void> {
		const loadedData: unknown =
			await this.loadData();

		if (
			typeof loadedData === "object" &&
			loadedData !== null
		) {
			this.settings = {
				...DEFAULT_SETTINGS,
				...loadedData,
			};
		} else {
			this.settings = {
				...DEFAULT_SETTINGS,
			};
		}
	}

	async saveSettings():
		Promise<void> {

		await this.saveData(
			this.settings,
		);
	}
}
