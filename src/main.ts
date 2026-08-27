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
	AnkiClient,
} from "./anki/anki-client";

import {
	AnkiExportModal,
} from "./ui/anki-export-modal";

import {
	syncFlashcards,
} from "./sync/sync-flashcards";

export default class AnkiExporterPlugin
	extends Plugin {

	settings:
		AnkiExporterSettings = {
		...DEFAULT_SETTINGS,
	};

	async onload():
		Promise<void> {

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
				await this
					.openExportModal();
			},
		);

		this.addCommand({
			id:
				"export-current-note-to-anki",

			name:
				"Export current note to Anki",

			callback:
				async () => {
					await this
						.openExportModal();
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

		if (
			file.extension !== "md"
		) {

			new Notice(
				"The current file is not a Markdown note.",
			);

			return;
		}

		const markdown =
			await this.app.vault
				.cachedRead(
					file,
				);

		const flashcards =
			parseFlashcards(
				markdown,
			);

		if (
			flashcards.length === 0
		) {

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

			async (
				deckName,
				duplicateHandling,
			) => {

				try {

					const result =
						await syncFlashcards(
							ankiClient,
							deckName,
							markdown,
							flashcards,
							duplicateHandling,
						);

					if (
						result.updatedMarkdown !==
						markdown
					) {

						await this.app.vault
							.modify(
								file,
								result.updatedMarkdown,
							);
					}

					let message =
						"Sync complete: " +
						`${result.created} created, ` +
						`${result.updated} updated, ` +
						`${result.unchanged} unchanged`;

					if (
						result.missing > 0
					) {

						message +=
							`, ${result.missing} missing`;
					}

					message += ".";

					new Notice(
						message,
					);

				} catch (error) {

					console.error(
						"Could not sync flashcards:",
						error,
					);

					new Notice(
						"Could not sync flashcards with Anki.",
					);

					throw error;
				}
			},

			async deckName => {

				try {

					await ankiClient
						.createDeck(
							deckName,
						);

				} catch (error) {

					console.error(
						"Could not create Anki deck:",
						error,
					);

					new Notice(
						"Could not create the Anki deck.",
					);

					throw error;
				}
			},

		).open();
	}

	async loadSettings():
		Promise<void> {

		const loadedData:
			unknown =
			await this.loadData();

		if (
			typeof loadedData ===
			"object" &&
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
