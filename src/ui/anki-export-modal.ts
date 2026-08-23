import {
	App,
	Modal,
	Notice,
} from "obsidian";

export class AnkiExportModal extends Modal {

	private availableDecks: string[];

	private selectedDeck: string;

	private searchInput!: HTMLInputElement;

	private deckSelect!: HTMLSelectElement;

	private createDeckInput!: HTMLInputElement;

	private createDeckButton!: HTMLButtonElement;

	private exportButton!: HTMLButtonElement;

	constructor(
		app: App,

		private readonly noteName: string,

		decks: string[],

		private readonly flashcardCount: number,

		private readonly onExport: (
			deckName: string,
		) => Promise<void>,

		private readonly onCreateDeck: (
			deckName: string,
		) => Promise<void>,

	) {
		super(app);

		this.availableDecks = [
			...decks,
		].sort((a, b) =>
			a.localeCompare(b),
		);

		this.selectedDeck =
			this.availableDecks.includes(
				"Default",
			)
				? "Default"
				: this.availableDecks[0] ?? "";
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.addClass(
			"anki-export-modal",
		);

		this.setTitle(
			"Export to Anki",
		);

		contentEl.createEl("p", {
			text:
				`${this.noteName}: ` +
				`${this.flashcardCount} ` +
				`flashcard(s) found.`,
			cls: "anki-export-summary",
		});

		this.renderSearch();
		this.renderDeckSelection();
		this.renderCreateDeck();
		this.renderActions();

		this.renderDeckOptions();
	}

	private renderSearch(): void {
		const container =
			this.contentEl.createDiv({
				cls: "anki-export-field",
			});

		container.createEl("label", {
			text: "Search deck",
		});

		this.searchInput =
			container.createEl("input");

		this.searchInput.type = "search";

		this.searchInput.placeholder =
			"Search Anki decks...";

		this.searchInput.addEventListener(
			"input",
			() => {
				this.renderDeckOptions();
			},
		);
	}

	private renderDeckSelection(): void {
		const container =
			this.contentEl.createDiv({
				cls: "anki-export-field",
			});

		container.createEl("label", {
			text: "Anki deck",
		});

		this.deckSelect =
			container.createEl("select");

		this.deckSelect.addEventListener(
			"change",
			() => {
				this.selectedDeck =
					this.deckSelect.value;

				this.updateExportButton();
			},
		);
	}

	private renderDeckOptions(): void {
		const query =
			this.searchInput
				?.value
				.trim()
				.toLowerCase()
			?? "";

		const matchingDecks =
			this.availableDecks.filter(
				deck =>
					deck
						.toLowerCase()
						.includes(query),
			);

		this.deckSelect.replaceChildren();

		if (
			matchingDecks.length === 0
		) {
			const option =
				new Option(
					"No matching decks",
					"",
					true,
					true,
				);

			option.disabled = true;

			this.deckSelect.add(option);

			this.selectedDeck = "";

			this.updateExportButton();

			return;
		}

		if (
			!matchingDecks.includes(
				this.selectedDeck,
			)
		) {
			// @ts-ignore
			this.selectedDeck =
				matchingDecks[0];
		}

		for (
			const deck of matchingDecks
			) {
			const option =
				new Option(
					deck,
					deck,
				);

			this.deckSelect.add(option);
		}

		this.deckSelect.value =
			this.selectedDeck;

		this.updateExportButton();
	}

	private renderCreateDeck(): void {
		const container =
			this.contentEl.createDiv({
				cls: "anki-export-field",
			});

		container.createEl("label", {
			text: "Create new deck",
		});

		const row =
			container.createDiv({
				cls: "anki-export-create-row",
			});

		this.createDeckInput =
			row.createEl("input");

		this.createDeckInput.type =
			"text";

		this.createDeckInput.placeholder =
			"e.g. Informatik::Algorithms";

		this.createDeckButton =
			row.createEl("button", {
				text: "Create & select",
			});

		this.createDeckButton.type =
			"button";

		this.createDeckButton.addEventListener(
			"click",
			() => {
				void this.handleCreateDeck();
			},
		);
	}

	private async handleCreateDeck():
		Promise<void> {

		const deckName =
			this.createDeckInput
				.value
				.trim();

		if (!deckName) {
			new Notice(
				"Enter a deck name.",
			);

			return;
		}

		if (
			this.availableDecks.includes(
				deckName,
			)
		) {
			this.selectedDeck =
				deckName;

			this.searchInput.value = "";

			this.createDeckInput.value =
				"";

			this.renderDeckOptions();

			new Notice(
				`Deck "${deckName}" already exists and was selected.`,
			);

			return;
		}

		this.createDeckButton.disabled =
			true;

		this.createDeckButton.textContent =
			"Creating...";

		try {
			await this.onCreateDeck(
				deckName,
			);

			this.availableDecks.push(
				deckName,
			);

			this.availableDecks.sort(
				(a, b) =>
					a.localeCompare(b),
			);

			this.selectedDeck =
				deckName;

			this.searchInput.value = "";

			this.createDeckInput.value =
				"";

			this.renderDeckOptions();

			new Notice(
				`Created deck "${deckName}".`,
			);

		} catch (error) {
			console.error(
				"Could not create Anki deck:",
				error,
			);

			new Notice(
				"Could not create Anki deck.",
			);

		} finally {
			this.createDeckButton.disabled =
				false;

			this.createDeckButton.textContent =
				"Create & select";
		}
	}

	private renderActions(): void {
		const actions =
			this.contentEl.createDiv({
				cls: "anki-export-actions",
			});

		const cancelButton =
			actions.createEl(
				"button",
				{
					text: "Cancel",
				},
			);

		cancelButton.type =
			"button";

		cancelButton.addEventListener(
			"click",
			() => {
				this.close();
			},
		);

		this.exportButton =
			actions.createEl(
				"button",
				{
					text:
						`Export ` +
						`${this.flashcardCount} ` +
						`card(s)`,
					cls: "mod-cta",
				},
			);

		this.exportButton.type =
			"button";

		this.exportButton.addEventListener(
			"click",
			() => {
				void this.handleExport();
			},
		);

		this.updateExportButton();
	}

	private async handleExport():
		Promise<void> {

		if (!this.selectedDeck) {
			return;
		}

		this.exportButton.disabled =
			true;

		this.exportButton.textContent =
			"Exporting...";

		try {
			await this.onExport(
				this.selectedDeck,
			);

			this.close();

		} catch (error) {
			console.error(
				"Anki export failed:",
				error,
			);

			new Notice(
				"Could not export flashcards to Anki.",
			);

			this.updateExportButton();
		}
	}

	private updateExportButton(): void {
		if (!this.exportButton) {
			return;
		}

		this.exportButton.disabled =
			!this.selectedDeck;

		this.exportButton.textContent =
			`Export ${this.flashcardCount} card(s)`;
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
