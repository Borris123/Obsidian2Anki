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
				await this
					.openExportModal();
			},
		);

		this.addCommand({
			id: "export-current-note-to-anki",

			name:
				"Export current note to Anki",

			callback: async () => {
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

			async deckName => {
				const noteIds =
					await ankiClient
						.addFlashcards(
							deckName,
							flashcards,
						);

				const successfulImports =
					noteIds.filter(
						id => id !== null,
					).length;

				new Notice(
					`Exported ` +
					`${successfulImports}/` +
					`${flashcards.length} ` +
					`flashcard(s) to ` +
					`"${deckName}".`,
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

	async loadSettings():
		Promise<void> {

		this.settings =
			Object.assign(
				{},
				DEFAULT_SETTINGS,
				await this.loadData(),
			);
	}

	async saveSettings():
		Promise<void> {

		await this.saveData(
			this.settings,
		);
	}
}
