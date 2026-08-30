import {App, Modal, Notice, Setting,} from "obsidian";

import type {DuplicateHandling,} from "../anki/duplicate-handling";
import {SyncOperation, SyncPlan} from "../sync/sync-plan";

export class AnkiExportModal extends Modal {
	private readonly availableDecks: string[];
	private selectedDeck: string;
	private duplicateHandling: DuplicateHandling = "skip";
	private searchInput!: HTMLInputElement;
	private deckSelect!: HTMLSelectElement;
	private createDeckInput!: HTMLInputElement;
	private createDeckButton!: HTMLButtonElement;
	private exportButton!: HTMLButtonElement;
	private analyzeFlashcardsButton!: HTMLButtonElement;
	private syncPlan: SyncPlan | null = null;

	constructor(app: App, private readonly noteName: string, decks: string[], private readonly flashcardCount: number, private readonly onExport: (deckName: string, duplicateHandling: DuplicateHandling) => Promise<void>, private readonly onCreateDeck: (deckName: string) => Promise<void>, private readonly onAnalyzeFlashcards: (deckName: string, duplicateHandling: DuplicateHandling) => Promise<SyncPlan>) {
		super(app);

		this.availableDecks = [...decks,].sort((a, b) => a.localeCompare(b),);
		this.selectedDeck = this.availableDecks.includes("Default",) ? "Default" : this.availableDecks[0] ?? "";
	}

	onOpen(): void {
		this.renderExportStep();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderExportStep(): void {
		const {
			contentEl,
		} = this;
		contentEl.empty();
		contentEl.addClass("anki-export-modal",);

		this.setTitle("Export to Anki",);

		contentEl.createEl("p", {
			text: `${this.noteName}: ` + `${this.flashcardCount} ` + "flashcard(s) found.",

			cls: "anki-export-summary",
		});

		this.renderSearch();
		this.renderDeckSelection();
		this.renderCreateDeck();
		this.renderDuplicateHandling();
		this.renderActions();
		this.renderDeckOptions();
	}

	private renderSearch(): void {

		const container = this.contentEl
			.createDiv({
				cls: "anki-export-field",
			});

		container.createEl("label", {
			text: "Search deck",
		},);

		this.searchInput = container.createEl("input",);
		this.searchInput.type = "search";
		this.searchInput.placeholder = "Search Anki decks...";
		this.searchInput
			.addEventListener("input", () => {
				this.renderDeckOptions();
			},);
	}

	private renderDeckSelection(): void {
		const container = this.contentEl
			.createDiv({
				cls: "anki-export-field",
			});

		container.createEl("label", {
			text: "Anki deck",
		},);

		this.deckSelect = container.createEl("select",);
		this.deckSelect
			.addEventListener("change", () => {
				this.selectedDeck = this.deckSelect.value;
				this.updateExportButton();
			},);
	}

	private renderDeckOptions(): void {
		const query = this.searchInput
			?.value
			.trim()
			.toLowerCase() ?? "";

		const matchingDecks = this.availableDecks
			.filter(deck => deck
				.toLowerCase()
				.includes(query));

		this.deckSelect
			.replaceChildren();

		if (matchingDecks.length === 0) {
			const option = new Option("No matching decks", "", true, true);
			option.disabled = true;
			this.deckSelect.add(option);
			this.selectedDeck = "";
			this.updateExportButton();
			return;
		}

		if (!matchingDecks.includes(this.selectedDeck)) {
			this.selectedDeck = matchingDecks[0]!;
		}

		for (const deck of matchingDecks) {
			const option = new Option(deck, deck);
			this.deckSelect.add(option);
		}

		this.deckSelect.value = this.selectedDeck;
		this.updateExportButton();
	}

	private renderCreateDeck(): void {
		const container = this.contentEl
			.createDiv({
				cls: "anki-export-field",
			});

		container.createEl("label", {
			text: "Create new deck",
		},);

		const row = container.createDiv({
			cls: "anki-export-create-row",
		});

		this.createDeckInput = row.createEl("input");
		this.createDeckInput.type = "text";
		this.createDeckInput.placeholder = "e.g. Informatik::Algorithms";
		this.createDeckButton = row.createEl("button", {
			text: "Create & select",
		},);

		this.createDeckButton.type = "button";
		this.createDeckButton
			.addEventListener("click", () => {
				void this.handleCreateDeck();
			},);
	}

	private renderDuplicateHandling(): void {
		const setting = new Setting(this.contentEl);
		setting
			.setName("Duplicates")
			.setDesc("Skip duplicates");

		setting.addToggle(toggle => {
			toggle.setValue(this.duplicateHandling === "add");
			toggle.onChange(value => {
				this.duplicateHandling = value ? "add" : "skip";
				setting.setDesc(value ? "Add duplicates" : "Skip duplicates");
			},);
		},);
	}

	private async handleCreateDeck(): Promise<void> {
		const deckName = this.createDeckInput
			.value
			.trim();

		if (!deckName) {
			new Notice("Enter a deck name.");
			return;
		}

		if (this.availableDecks
			.includes(deckName)) {
			this.selectedDeck = deckName;
			this.searchInput.value = "";
			this.createDeckInput.value = "";
			this.renderDeckOptions();
			new Notice(`Deck "${deckName}" already exists and was selected.`);
			return;
		}

		this.createDeckButton.disabled = true;
		this.createDeckButton.textContent = "Creating...";
		try {
			await this.onCreateDeck(deckName);
			this.availableDecks.push(deckName);
			this.availableDecks.sort((a, b) => a.localeCompare(b));
			this.selectedDeck = deckName;
			this.searchInput.value = "";
			this.createDeckInput.value = "";
			this.renderDeckOptions();
			new Notice(`Created deck "${deckName}".`);

		} catch (error) {
			console.error("Could not create Anki deck:", error);
			new Notice("Could not create Anki deck.");

		} finally {
			this.createDeckButton.disabled = false;
			this.createDeckButton.textContent = "Create & select";
		}
	}

	private renderActions(): void {
		const actions = this.contentEl
			.createDiv({
				cls: "anki-export-actions",
			});
		const cancelButton = actions.createEl("button", {
			text: "Cancel",
		},);
		cancelButton.type = "button";
		cancelButton
			.addEventListener("click", () => {
				this.close();
			});
		this.analyzeFlashcardsButton = actions.createEl("button", {
			text: "Analyze Flashcards",
		})
		this.analyzeFlashcardsButton.type = "button";
		this.analyzeFlashcardsButton.addEventListener("click", () => {
			void this.handleAnalyze();
		})
		this.exportButton = actions.createEl("button", {
			text: `Export ` + `${this.flashcardCount} ` + `card(s)`, cls: "mod-cta",
		});

		this.exportButton.type = "button";
		this.exportButton
			.addEventListener("click", () => {
				void this.handleExport();
			},);

		this.updateExportButton();
	}

	private async handleAnalyze(): Promise<void> {
		if (!this.selectedDeck) {
			return;
		}
		this.analyzeFlashcardsButton.disabled = true;
		this.analyzeFlashcardsButton.textContent = "Analyzing...";
		try {
			this.syncPlan = await this.onAnalyzeFlashcards(this.selectedDeck, this.duplicateHandling);
			this.renderAnalysisStep(this.syncPlan);
		} catch (error) {
			console.error("Analyzing flashcards failed:", error);
			new Notice("Could not analyze flashcards.");
		} finally {
			this.analyzeFlashcardsButton.disabled = false;
			this.analyzeFlashcardsButton.textContent = "Analyze Flashcards";
		}
	}

	private renderAnalysisStep(plan: SyncPlan): void {
		this.contentEl.empty();
		this.setTitle("Flashcard Analysis");

		this.contentEl.createEl("p", {
			text: `${plan.operations.length} flashcard(s) analyzed.`, cls: "anki-analysis-summary"
		});

		const created = plan.operations.filter(operation => operation.type === "create");
		const updated = plan.operations.filter(operation => operation.type === "update");
		const skipped = plan.operations.filter(operation => operation.type === "skip");
		const unchanged = plan.operations.filter(operation => operation.type === "unchanged");

		this.renderAnalysisSection("Created", created);
		this.renderAnalysisSection("Updated", updated);
		this.renderAnalysisSection("Skipped", skipped);
		this.renderAnalysisSection("Unchanged", unchanged);

		this.renderAnalysisActions();
	}

	private renderAnalysisSection(title: string, operations: SyncOperation[]): void {
		const section = this.contentEl.createDiv({
			cls: "anki-analysis-section"
		});

		const toggleButton = section.createEl("button", {
			text: `${title} - ${operations.length}`, cls: "anki-analysis-section-toggle"
		});

		toggleButton.type = "button";

		const content = section.createDiv({
			cls: "anki-analysis-section-content"
		});

		content.hidden = true;

		if (operations.length === 0) {
			toggleButton.disabled = true;
			return;
		}

		for (const operation of operations) {
			this.renderAnalysisOperation(content, operation);
		}

		toggleButton.setAttribute("aria-expanded", "false");

		toggleButton.addEventListener("click", () => {
			content.hidden = !content.hidden;
			toggleButton.textContent = content.hidden ? `${title} (${operations.length})` : `${title} (${operations.length}) ▲`;
			toggleButton.setAttribute("aria-expanded", String(!content.hidden));
		});
	}

	private renderAnalysisOperation(container: HTMLElement, operation: SyncOperation): void {
		const card = container.createDiv({
			cls: "anki-analysis-card"
		});

		switch (operation.type) {
			case "create":
				this.renderCreatedOperation(card, operation);
				break;

			case "update":
				this.renderUpdatedOperation(card, operation);
				break;

			case "skip":
				this.renderSkippedOperation(card, operation);
				break;

			case "unchanged":
				this.renderUnchangedOperation(card, operation);
				break;
		}
	}

	private renderCreatedOperation(container: HTMLElement, operation: Extract<SyncOperation, {
		type: "create"
	}>): void {
		container.createDiv({
			text: operation.flashcard.front, cls: "anki-analysis-card-front"
		});

		container.createDiv({
			text: operation.flashcard.back, cls: "anki-analysis-card-back"
		});

		if (operation.previousNoteId !== undefined) {
			container.createEl("small", {
				text: `Previous Anki note ID: ${operation.previousNoteId}`, cls: "anki-analysis-card-meta"
			});
		}
	}

	private renderUnchangedOperation(container: HTMLElement, operation: Extract<SyncOperation, {
		type: "unchanged"
	}>): void {
		container.createDiv({
			text: operation.flashcard.front, cls: "anki-analysis-card-front"
		});

		container.createDiv({
			text: operation.flashcard.back, cls: "anki-analysis-card-back"
		});
	}

	private renderSkippedOperation(container: HTMLElement, operation: Extract<SyncOperation, { type: "skip" }>): void {
		container.createDiv({
			text: operation.flashcard.front, cls: "anki-analysis-card-front"
		});

		container.createDiv({
			text: operation.flashcard.back, cls: "anki-analysis-card-back"
		});

		const reason = operation.reason === "duplicate" ? "Duplicate already exists in the selected deck." : operation.reason;

		container.createEl("small", {
			text: reason, cls: "anki-analysis-card-meta"
		});
	}

	private renderUpdatedOperation(container: HTMLElement, operation: Extract<SyncOperation, {
		type: "update"
	}>): void {
		container.createDiv({
			text: operation.flashcard.front, cls: "anki-analysis-card-front"
		});

		const comparison = container.createDiv({
			cls: "anki-analysis-comparison"
		});

		const before = comparison.createDiv({
			cls: "anki-analysis-comparison-side"
		});

		before.createEl("strong", {
			text: "Before"
		});

		before.createDiv({
			text: `Front: ${operation.previousFront}`
		});

		before.createDiv({
			text: `Back: ${operation.previousBack}`
		});

		const after = comparison.createDiv({
			cls: "anki-analysis-comparison-side"
		});

		after.createEl("strong", {
			text: "After"
		});

		after.createDiv({
			text: `Front: ${operation.flashcard.front}`
		});

		after.createDiv({
			text: `Back: ${operation.flashcard.back}`
		});
	}

	private renderAnalysisActions(): void {
		const actions = this.contentEl.createDiv({
			cls: "anki-export-actions"
		});

		const backButton = actions.createEl("button", {
			text: "Back"
		});
		backButton.type = "button";
		backButton.addEventListener("click", () => {
			this.renderExportStep();
		});

		this.exportButton = actions.createEl("button", {
			text: "Export Flashcards", cls: "mod-cta"
		});
		this.exportButton.type = "button";
		this.exportButton.addEventListener("click", () => {
			void this.handleExport();
		});
	}

	private async handleExport(): Promise<void> {
		if (!this.selectedDeck) {
			return;
		}
		this.exportButton.disabled = true;
		this.exportButton.textContent = "Exporting...";
		try {
			await this.onExport(this.selectedDeck, this.duplicateHandling);
			this.close();
		} catch (error) {
			console.error("Anki export failed:", error,);
			new Notice("Could not export flashcards to Anki.",);
			this.updateExportButton();
		}
	}

	private updateExportButton(): void {
		if (!this.exportButton) {
			return;
		}
		this.exportButton.disabled = !this.selectedDeck;
		this.exportButton.textContent = `Export ${this.flashcardCount} card(s)`;
	}
}
