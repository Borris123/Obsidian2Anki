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
