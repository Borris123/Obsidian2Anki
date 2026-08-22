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
import {AnkiClient} from "./anki/anki-client";

export default class AnkiExporterPlugin extends Plugin {

	settings: AnkiExporterSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(
			new AnkiExporterSettingTab(
				this.app,
				this,
			),
		);

		this.addCommand({
			id: "parse-current-note",
			name: "Parse current note for Anki cards",

			callback: async () => {
				await this.parseCurrentNote();
			},
		});

		this.addCommand({
			id: "export-current-note-to-anki",
			name: "Export current note to Anki",

			callback: async () => {
				await this.exportCurrentNote();
			},
		});

		this.addCommand({
			id: "test-anki-connection",
			name: "Test Anki connection",

			callback: async () => {
				const client = new AnkiClient(
					this.settings.ankiConnectUrl,
				);

				try {
					const decks =
						await client.getDeckNames();

					console.log(
						"Anki decks:",
						decks,
					);

					new Notice(
						`Connected to Anki. Found ${decks.length} deck(s).`,
					);
				} catch (error) {
					console.error(error);

					new Notice(
						"Could not connect to Anki.",
					);
				}
			},
		});
	}

	private async parseCurrentNote(): Promise<void> {
		const file = this.app.workspace.getActiveFile();

		if (!file) {
			new Notice("No note is currently open.");
			return;
		}

		const markdown =
			await this.app.vault.cachedRead(file);

		const flashcards =
			parseFlashcards(markdown);

		console.log(
			"Found flashcards:",
			flashcards,
		);

		new Notice(
			`Found ${flashcards.length} flashcard(s).`,
		);
	}

	private async exportCurrentNote(): Promise<void> {
		const file = this.app.workspace.getActiveFile();

		if (!file) {
			new Notice("No note is currently open.");
			return;
		}

		const markdown =
			await this.app.vault.cachedRead(file);

		const flashcards =
			parseFlashcards(markdown);

		if (flashcards.length === 0) {
			new Notice("No flashcards found.");
			return;
		}

		const ankiClient = new AnkiClient(
			this.settings.ankiConnectUrl,
		);

		try {
			const noteIds =
				await ankiClient.addFlashcards(
					"Default",
					flashcards,
				);

			new Notice(
				`Exported ${noteIds.length} flashcard(s) to Anki.`,
			);
		} catch (error) {
			console.error(
				"Failed to export flashcards:",
				error,
			);

			new Notice(
				"Could not export flashcards to Anki.",
			);
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
