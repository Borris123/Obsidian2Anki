/**
 * @vitest-environment jsdom
 */

import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";

import type {App} from "obsidian";
import type {DuplicateHandling} from "../anki/duplicate-handling";
import type {SyncPlan} from "../sync/sync-plan";
import {AnkiExportModal} from "./anki-export-modal";


const mocks = vi.hoisted(() => ({
	notice: vi.fn(),
	setTitle: vi.fn(),
	close: vi.fn()
}));


vi.mock("obsidian", () => {
	class Modal {
		contentEl: HTMLElement;

		constructor() {
			this.contentEl = document.createElement("div");
		}

		setTitle(title: string): void {
			mocks.setTitle(title);
		}

		close(): void {
			mocks.close();

			const modal = this as {
				onClose?: () => void;
			};

			modal.onClose?.();
		}
	}


	class Notice {
		constructor(message: string) {
			mocks.notice(message);
		}
	}


	class Setting {
		private readonly settingEl: HTMLDivElement;
		private readonly nameEl: HTMLDivElement;
		private readonly descEl: HTMLDivElement;
		private readonly controlEl: HTMLDivElement;

		constructor(containerEl: HTMLElement) {
			this.settingEl = document.createElement("div");
			this.settingEl.classList.add("setting-item");

			const infoEl = document.createElement("div");
			infoEl.classList.add("setting-item-info");

			this.nameEl = document.createElement("div");
			this.nameEl.classList.add("setting-item-name");

			this.descEl = document.createElement("div");
			this.descEl.classList.add("setting-item-description");

			this.controlEl = document.createElement("div");
			this.controlEl.classList.add("setting-item-control");

			infoEl.append(this.nameEl, this.descEl);
			this.settingEl.append(infoEl, this.controlEl);
			containerEl.appendChild(this.settingEl);
		}

		setName(name: string): this {
			this.nameEl.textContent = name;

			return this;
		}

		setDesc(description: string): this {
			this.descEl.textContent = description;

			return this;
		}

		addToggle(callback: (toggle: {
			setValue: (value: boolean) => unknown;
			onChange: (handler: (value: boolean) => void | Promise<void>) => unknown;
		}) => void): this {
			const input = document.createElement("input");
			input.type = "checkbox";

			this.controlEl.appendChild(input);

			const toggle = {
				setValue(value: boolean) {
					input.checked = value;

					return toggle;
				},

				onChange(handler: (value: boolean) => void | Promise<void>) {
					input.addEventListener("change", () => {
						void handler(input.checked);
					});

					return toggle;
				}
			};

			callback(toggle);

			return this;
		}
	}


	return {
		Modal,
		Notice,
		Setting
	};
});


beforeAll(() => {
	Object.defineProperty(HTMLElement.prototype, "addClass", {
		value(this: HTMLElement, className: string) {
			this.classList.add(className);
		}
	});

	Object.defineProperty(HTMLElement.prototype, "empty", {
		value(this: HTMLElement) {
			this.replaceChildren();
		}
	});

	Object.defineProperty(HTMLElement.prototype, "createEl", {
		value(this: HTMLElement, tagName: string, options?: {
			text?: string;
			cls?: string;
		}) {
			const element = document.createElement(tagName);

			if (options?.text !== undefined) {
				element.textContent = options.text;
			}

			if (options?.cls) {
				element.classList.add(options.cls);
			}

			this.appendChild(element);

			return element;
		}
	});

	Object.defineProperty(HTMLElement.prototype, "createDiv", {
		value(this: HTMLElement, options?: {
			text?: string;
			cls?: string;
		}) {
			const element = document.createElement("div");

			if (options?.text !== undefined) {
				element.textContent = options.text;
			}

			if (options?.cls) {
				element.classList.add(options.cls);
			}

			this.appendChild(element);

			return element;
		}
	});
});


function createModal(options?: {
	decks?: string[];
	noteName?: string;
	flashcardCount?: number;
	onExport?: (deckName: string, duplicateHandling: DuplicateHandling) => Promise<void>;
	onCreateDeck?: (deckName: string) => Promise<void>;
	onAnalyzeFlashcards?: (deckName: string, duplicateHandling: DuplicateHandling) => Promise<SyncPlan>;
}) {
	const onExport = options?.onExport ?? vi.fn().mockResolvedValue(undefined);
	const onCreateDeck = options?.onCreateDeck ?? vi.fn().mockResolvedValue(undefined);

	const onAnalyzeFlashcards = options?.onAnalyzeFlashcards ?? vi.fn().mockResolvedValue({
		deckName: "Default",
		duplicateHandling: "skip",
		operations: []
	});

	const modal = new AnkiExportModal(
		{} as App,
		options?.noteName ?? "Algorithms",
		options?.decks ?? ["Default", "Algorithms"],
		options?.flashcardCount ?? 3,
		onExport,
		onCreateDeck,
		onAnalyzeFlashcards
	);

	modal.onOpen();

	return {
		modal,
		onExport,
		onCreateDeck,
		onAnalyzeFlashcards
	};
}


function getSearchInput(modal: AnkiExportModal): HTMLInputElement {
	const input = modal.contentEl.querySelector('input[type="search"]');

	if (!(input instanceof HTMLInputElement)) {
		throw new Error("Search input not found.");
	}

	return input;
}


function getCreateDeckInput(modal: AnkiExportModal): HTMLInputElement {
	const input = modal.contentEl.querySelector('input[type="text"]');

	if (!(input instanceof HTMLInputElement)) {
		throw new Error("Create deck input not found.");
	}

	return input;
}


function getDeckSelect(modal: AnkiExportModal): HTMLSelectElement {
	const select = modal.contentEl.querySelector("select");

	if (!(select instanceof HTMLSelectElement)) {
		throw new Error("Deck select not found.");
	}

	return select;
}


function getButton(modal: AnkiExportModal, text: string): HTMLButtonElement {
	const buttons = Array.from(modal.contentEl.querySelectorAll("button"));
	const button = buttons.find(candidate => candidate.textContent === text);

	if (!button) {
		throw new Error(`Button "${text}" not found.`);
	}

	return button;
}


function getDuplicateToggle(modal: AnkiExportModal): HTMLInputElement {
	const toggle = modal.contentEl.querySelector('input[type="checkbox"]');

	if (!(toggle instanceof HTMLInputElement)) {
		throw new Error("Duplicate toggle not found.");
	}

	return toggle;
}


async function flushPromises(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}


function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});

	return {
		promise,
		resolve,
		reject
	};
}


describe("AnkiExportModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});


	it("renders the modal title and flashcard summary", () => {
		const {modal} = createModal({
			noteName: "Data Structures",
			flashcardCount: 5
		});

		expect(mocks.setTitle).toHaveBeenCalledWith("Export to Anki");
		expect(modal.contentEl.textContent).toContain("Data Structures: 5 flashcard(s) found.");
		expect(modal.contentEl.classList.contains("anki-export-modal")).toBe(true);
	});


	it("sorts decks alphabetically", () => {
		const {modal} = createModal({
			decks: ["Networks", "Algorithms", "Default"]
		});

		const select = getDeckSelect(modal);

		expect(Array.from(select.options).map(option => option.value)).toEqual([
			"Algorithms",
			"Default",
			"Networks"
		]);
	});


	it("selects Default initially when it exists", () => {
		const {modal} = createModal({
			decks: ["Algorithms", "Default"]
		});

		expect(getDeckSelect(modal).value).toBe("Default");
	});


	it("selects the first alphabetical deck when Default does not exist", () => {
		const {modal} = createModal({
			decks: ["Networks", "Algorithms"]
		});

		expect(getDeckSelect(modal).value).toBe("Algorithms");
	});


	it("filters decks using the search input", () => {
		const {modal} = createModal({
			decks: ["Algorithms", "Default", "Networks"]
		});

		const searchInput = getSearchInput(modal);
		searchInput.value = "algo";
		searchInput.dispatchEvent(new Event("input", {bubbles: true}));

		const select = getDeckSelect(modal);

		expect(Array.from(select.options).map(option => option.value)).toEqual(["Algorithms"]);
		expect(select.value).toBe("Algorithms");
	});


	it("searches case-insensitively and trims the query", () => {
		const {modal} = createModal({
			decks: ["Algorithms", "Networks"]
		});

		const searchInput = getSearchInput(modal);
		searchInput.value = "  ALGO  ";
		searchInput.dispatchEvent(new Event("input"));

		const select = getDeckSelect(modal);

		expect(select.options).toHaveLength(1);
		expect(select.value).toBe("Algorithms");
	});


	it("disables exporting when no decks match the search", () => {
		const {modal} = createModal({
			decks: ["Default", "Algorithms"]
		});

		const searchInput = getSearchInput(modal);
		searchInput.value = "does-not-exist";
		searchInput.dispatchEvent(new Event("input"));

		const select = getDeckSelect(modal);

		expect(select.options).toHaveLength(1);
		expect(select.options[0]!.textContent).toBe("No matching decks");
		expect(select.options[0]!.disabled).toBe(true);
		expect(getButton(modal, "Export 3 card(s)").disabled).toBe(true);
	});


	it("updates the selected deck when the select changes", async () => {
		const onExport = vi.fn().mockResolvedValue(undefined);

		const {modal} = createModal({
			decks: ["Default", "Algorithms"],
			onExport
		});

		const select = getDeckSelect(modal);
		select.value = "Algorithms";
		select.dispatchEvent(new Event("change"));

		getButton(modal, "Export 3 card(s)").click();

		await flushPromises();

		expect(onExport).toHaveBeenCalledWith("Algorithms", "skip");
	});


	it("shows a notice when creating a deck without a name", async () => {
		const onCreateDeck = vi.fn().mockResolvedValue(undefined);

		const {modal} = createModal({
			onCreateDeck
		});

		getCreateDeckInput(modal).value = "   ";
		getButton(modal, "Create & select").click();

		await flushPromises();

		expect(onCreateDeck).not.toHaveBeenCalled();
		expect(mocks.notice).toHaveBeenCalledWith("Enter a deck name.");
	});


	it("selects an existing deck instead of creating it again", async () => {
		const onCreateDeck = vi.fn().mockResolvedValue(undefined);

		const {modal} = createModal({
			decks: ["Default", "Algorithms"],
			onCreateDeck
		});

		const createInput = getCreateDeckInput(modal);
		createInput.value = "Algorithms";

		getButton(modal, "Create & select").click();

		await flushPromises();

		expect(onCreateDeck).not.toHaveBeenCalled();
		expect(getDeckSelect(modal).value).toBe("Algorithms");
		expect(createInput.value).toBe("");
		expect(mocks.notice).toHaveBeenCalledWith('Deck "Algorithms" already exists and was selected.');
	});


	it("trims a new deck name before creating it", async () => {
		const onCreateDeck = vi.fn().mockResolvedValue(undefined);

		const {modal} = createModal({
			onCreateDeck
		});

		getCreateDeckInput(modal).value = "  Computer Science  ";
		getButton(modal, "Create & select").click();

		await flushPromises();

		expect(onCreateDeck).toHaveBeenCalledWith("Computer Science");
	});


	it("adds and selects a newly created deck", async () => {
		const onCreateDeck = vi.fn().mockResolvedValue(undefined);

		const {modal} = createModal({
			decks: ["Default", "Networks"],
			onCreateDeck
		});

		const createInput = getCreateDeckInput(modal);
		createInput.value = "Algorithms";

		getButton(modal, "Create & select").click();

		await flushPromises();

		const select = getDeckSelect(modal);

		expect(Array.from(select.options).map(option => option.value)).toEqual([
			"Algorithms",
			"Default",
			"Networks"
		]);

		expect(select.value).toBe("Algorithms");
		expect(createInput.value).toBe("");
		expect(mocks.notice).toHaveBeenCalledWith('Created deck "Algorithms".');
	});


	it("shows a loading state while creating a deck", async () => {
		const creation = deferred<void>();
		const onCreateDeck = vi.fn().mockReturnValue(creation.promise);

		const {modal} = createModal({
			decks: ["Default", "Algorithms"],
			onCreateDeck
		});

		getCreateDeckInput(modal).value = "Networks";

		const button = getButton(modal, "Create & select");
		button.click();

		expect(onCreateDeck).toHaveBeenCalledWith("Networks");
		expect(button.disabled).toBe(true);
		expect(button.textContent).toBe("Creating...");

		creation.resolve();

		await flushPromises();

		expect(button.disabled).toBe(false);
		expect(button.textContent).toBe("Create & select");
	});


	it("restores the create button when deck creation fails", async () => {
		const onCreateDeck = vi.fn().mockRejectedValue(new Error("Creation failed"));

		const {modal} = createModal({
			decks: ["Default", "Algorithms"],
			onCreateDeck
		});

		getCreateDeckInput(modal).value = "Networks";

		const button = getButton(modal, "Create & select");
		button.click();

		await flushPromises();

		expect(onCreateDeck).toHaveBeenCalledWith("Networks");
		expect(console.error).toHaveBeenCalledWith("Could not create Anki deck:", expect.any(Error));
		expect(mocks.notice).toHaveBeenCalledWith("Could not create Anki deck.");
		expect(button.disabled).toBe(false);
		expect(button.textContent).toBe("Create & select");
	});


	it("exports to the selected deck", async () => {
		const onExport = vi.fn().mockResolvedValue(undefined);

		const {modal} = createModal({
			decks: ["Default"],
			onExport
		});

		getButton(modal, "Export 3 card(s)").click();

		await flushPromises();

		expect(onExport).toHaveBeenCalledWith("Default", "skip");
		expect(mocks.close).toHaveBeenCalledOnce();
	});


	it("shows an exporting state while export is running", async () => {
		const exportResult = deferred<void>();
		const onExport = vi.fn().mockReturnValue(exportResult.promise);

		const {modal} = createModal({
			onExport
		});

		const button = getButton(modal, "Export 3 card(s)");
		button.click();

		expect(button.disabled).toBe(true);
		expect(button.textContent).toBe("Exporting...");

		exportResult.resolve();

		await flushPromises();

		expect(mocks.close).toHaveBeenCalledOnce();
	});


	it("keeps the modal open and restores the export button when export fails", async () => {
		const onExport = vi.fn().mockRejectedValue(new Error("Export failed"));

		const {modal} = createModal({
			onExport
		});

		const button = getButton(modal, "Export 3 card(s)");
		button.click();

		await flushPromises();

		expect(mocks.close).not.toHaveBeenCalled();
		expect(console.error).toHaveBeenCalledWith("Anki export failed:", expect.any(Error));
		expect(mocks.notice).toHaveBeenCalledWith("Could not export flashcards to Anki.");
		expect(button.disabled).toBe(false);
		expect(button.textContent).toBe("Export 3 card(s)");
	});


	it("disables exporting when there are no decks", () => {
		const {modal, onExport} = createModal({
			decks: []
		});

		const button = getButton(modal, "Export 3 card(s)");

		expect(button.disabled).toBe(true);

		button.click();

		expect(onExport).not.toHaveBeenCalled();
	});


	it("closes the modal when Cancel is clicked", () => {
		const {modal} = createModal();

		getButton(modal, "Cancel").click();

		expect(mocks.close).toHaveBeenCalledOnce();
	});


	it("clears the modal content when closed", () => {
		const {modal} = createModal();

		expect(modal.contentEl.children.length).toBeGreaterThan(0);

		modal.onClose();

		expect(modal.contentEl.children).toHaveLength(0);
	});


	it("skips duplicates by default", async () => {
		const onExport = vi.fn().mockResolvedValue(undefined);

		const {modal} = createModal({
			onExport
		});

		expect(getDuplicateToggle(modal).checked).toBe(false);

		getButton(modal, "Export 3 card(s)").click();

		await flushPromises();

		expect(onExport).toHaveBeenCalledWith("Default", "skip");
	});


	it("allows adding duplicates when duplicate toggle is enabled", async () => {
		const onExport = vi.fn().mockResolvedValue(undefined);

		const {modal} = createModal({
			onExport
		});

		const toggle = getDuplicateToggle(modal);
		toggle.checked = true;
		toggle.dispatchEvent(new Event("change"));

		getButton(modal, "Export 3 card(s)").click();

		await flushPromises();

		expect(onExport).toHaveBeenCalledWith("Default", "add");
	});


	it("analyzes flashcards for the selected deck", async () => {
		const plan: SyncPlan = {
			deckName: "Default",
			duplicateHandling: "skip",
			operations: []
		};

		const onAnalyzeFlashcards = vi.fn().mockResolvedValue(plan);

		const {modal} = createModal({
			decks: ["Default"],
			onAnalyzeFlashcards
		});

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		expect(onAnalyzeFlashcards).toHaveBeenCalledWith("Default", "skip");
		expect(mocks.setTitle).toHaveBeenLastCalledWith("Flashcard Analysis");
	});


	it("does not analyze flashcards when no deck is selected", async () => {
		const onAnalyzeFlashcards = vi.fn().mockResolvedValue({
			deckName: "",
			duplicateHandling: "skip",
			operations: []
		});

		const {modal} = createModal({
			decks: [],
			onAnalyzeFlashcards
		});

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		expect(onAnalyzeFlashcards).not.toHaveBeenCalled();
	});


	it("shows an analyzing state while analysis is running", async () => {
		const analysis = deferred<SyncPlan>();
		const onAnalyzeFlashcards = vi.fn().mockReturnValue(analysis.promise);

		const {modal} = createModal({
			onAnalyzeFlashcards
		});

		const button = getButton(modal, "Analyze Flashcards");
		button.click();

		expect(button.disabled).toBe(true);
		expect(button.textContent).toBe("Analyzing...");

		analysis.resolve({
			deckName: "Default",
			duplicateHandling: "skip",
			operations: []
		});

		await flushPromises();

		expect(mocks.setTitle).toHaveBeenLastCalledWith("Flashcard Analysis");
	});


	it("restores the analyze button and shows a notice when analysis fails", async () => {
		const onAnalyzeFlashcards = vi.fn().mockRejectedValue(new Error("Analysis failed"));

		const {modal} = createModal({
			onAnalyzeFlashcards
		});

		const button = getButton(modal, "Analyze Flashcards");
		button.click();

		await flushPromises();

		expect(console.error).toHaveBeenCalledWith("Analyzing flashcards failed:", expect.any(Error));
		expect(mocks.notice).toHaveBeenCalledWith("Could not analyze flashcards.");
		expect(button.disabled).toBe(false);
		expect(button.textContent).toBe("Analyze Flashcards");
	});


	it("uses the selected duplicate handling when analyzing flashcards", async () => {
		const onAnalyzeFlashcards = vi.fn().mockResolvedValue({
			deckName: "Default",
			duplicateHandling: "add",
			operations: []
		});

		const {modal} = createModal({
			onAnalyzeFlashcards
		});

		const toggle = getDuplicateToggle(modal);
		toggle.checked = true;
		toggle.dispatchEvent(new Event("change"));

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		expect(onAnalyzeFlashcards).toHaveBeenCalledWith("Default", "add");
	});


	it("renders the analysis summary and operation counts", async () => {
		const plan: SyncPlan = {
			deckName: "Default",
			duplicateHandling: "skip",
			operations: [
				{
					type: "create",
					flashcard: {
						front: "Queue",
						back: "FIFO"
					}
				},
				{
					type: "update",
					flashcard: {
						ankiNoteId: 100,
						front: "Array",
						back: "New"
					},
					noteId: 100,
					previousFront: "Array",
					previousBack: "Old"
				},
				{
					type: "skip",
					flashcard: {
						front: "Stack",
						back: "LIFO"
					},
					reason: "duplicate"
				},
				{
					type: "unchanged",
					flashcard: {
						ankiNoteId: 200,
						front: "Tree",
						back: "Hierarchy"
					},
					noteId: 200
				}
			]
		};

		const onAnalyzeFlashcards = vi.fn().mockResolvedValue(plan);

		const {modal} = createModal({
			onAnalyzeFlashcards
		});

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		expect(modal.contentEl.textContent).toContain("4 flashcard(s) analyzed.");
		expect(getButton(modal, "Created - 1")).toBeDefined();
		expect(getButton(modal, "Updated - 1")).toBeDefined();
		expect(getButton(modal, "Skipped - 1")).toBeDefined();
		expect(getButton(modal, "Unchanged - 1")).toBeDefined();
	});


	it("disables analysis sections without operations", async () => {
		const onAnalyzeFlashcards = vi.fn().mockResolvedValue({
			deckName: "Default",
			duplicateHandling: "skip",
			operations: [
				{
					type: "create",
					flashcard: {
						front: "Array",
						back: "Collection"
					}
				}
			]
		});

		const {modal} = createModal({
			onAnalyzeFlashcards
		});

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		expect(getButton(modal, "Created - 1").disabled).toBe(false);
		expect(getButton(modal, "Updated - 0").disabled).toBe(true);
		expect(getButton(modal, "Skipped - 0").disabled).toBe(true);
		expect(getButton(modal, "Unchanged - 0").disabled).toBe(true);
	});


	it("expands and collapses an analysis section", async () => {
		const onAnalyzeFlashcards = vi.fn().mockResolvedValue({
			deckName: "Default",
			duplicateHandling: "skip",
			operations: [
				{
					type: "create",
					flashcard: {
						front: "Array",
						back: "Collection"
					}
				}
			]
		});

		const {modal} = createModal({
			onAnalyzeFlashcards
		});

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		const button = getButton(modal, "Created - 1");
		const section = button.closest(".anki-analysis-section");
		const content = section?.querySelector(".anki-analysis-section-content");

		expect(content).toBeInstanceOf(HTMLElement);

		const contentElement = content as HTMLElement;

		expect(contentElement.hidden).toBe(true);
		expect(button.getAttribute("aria-expanded")).toBe("false");

		button.click();

		expect(contentElement.hidden).toBe(false);
		expect(button.getAttribute("aria-expanded")).toBe("true");
		expect(button.textContent).toBe("Created (1) ▲");

		button.click();

		expect(contentElement.hidden).toBe(true);
		expect(button.getAttribute("aria-expanded")).toBe("false");
		expect(button.textContent).toBe("Created (1)");
	});


	it("renders a created flashcard", async () => {
		const onAnalyzeFlashcards = vi.fn().mockResolvedValue({
			deckName: "Default",
			duplicateHandling: "skip",
			operations: [
				{
					type: "create",
					flashcard: {
						front: "Array",
						back: "Collection"
					}
				}
			]
		});

		const {modal} = createModal({
			onAnalyzeFlashcards
		});

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		const card = modal.contentEl.querySelector(".anki-analysis-card");

		expect(card?.textContent).toContain("Array");
		expect(card?.textContent).toContain("Collection");
	});


	it("renders the previous note ID when recreating a flashcard", async () => {
		const onAnalyzeFlashcards = vi.fn().mockResolvedValue({
			deckName: "Default",
			duplicateHandling: "skip",
			operations: [
				{
					type: "create",
					flashcard: {
						ankiNoteId: 100,
						front: "Array",
						back: "Collection"
					},
					previousNoteId: 100
				}
			]
		});

		const {modal} = createModal({
			onAnalyzeFlashcards
		});

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		expect(modal.contentEl.textContent).toContain("Previous Anki note ID: 100");
	});


	it("renders an unchanged flashcard", async () => {
		const onAnalyzeFlashcards = vi.fn().mockResolvedValue({
			deckName: "Default",
			duplicateHandling: "skip",
			operations: [
				{
					type: "unchanged",
					flashcard: {
						ankiNoteId: 100,
						front: "Array",
						back: "Collection"
					},
					noteId: 100
				}
			]
		});

		const {modal} = createModal({
			onAnalyzeFlashcards
		});

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		const card = modal.contentEl.querySelector(".anki-analysis-card");

		expect(card?.textContent).toContain("Array");
		expect(card?.textContent).toContain("Collection");
	});


	it("renders the duplicate reason for skipped flashcards", async () => {
		const onAnalyzeFlashcards = vi.fn().mockResolvedValue({
			deckName: "Default",
			duplicateHandling: "skip",
			operations: [
				{
					type: "skip",
					flashcard: {
						front: "Array",
						back: "Collection"
					},
					reason: "duplicate"
				}
			]
		});

		const {modal} = createModal({
			onAnalyzeFlashcards
		});

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		expect(modal.contentEl.textContent).toContain("Array");
		expect(modal.contentEl.textContent).toContain("Collection");
		expect(modal.contentEl.textContent).toContain(
			"Duplicate already exists in the selected deck."
		);
	});


	it("renders before and after values for updated flashcards", async () => {
		const onAnalyzeFlashcards = vi.fn().mockResolvedValue({
			deckName: "Default",
			duplicateHandling: "skip",
			operations: [
				{
					type: "update",
					flashcard: {
						ankiNoteId: 100,
						front: "What is an array?",
						back: "A contiguous collection"
					},
					noteId: 100,
					previousFront: "Array",
					previousBack: "Collection"
				}
			]
		});

		const {modal} = createModal({
			onAnalyzeFlashcards
		});

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		const comparison = modal.contentEl.querySelector(".anki-analysis-comparison");

		expect(comparison?.textContent).toContain("Before");
		expect(comparison?.textContent).toContain("Front: Array");
		expect(comparison?.textContent).toContain("Back: Collection");

		expect(comparison?.textContent).toContain("After");
		expect(comparison?.textContent).toContain("Front: What is an array?");
		expect(comparison?.textContent).toContain("Back: A contiguous collection");
	});


	it("returns to the export step when Back is clicked", async () => {
		const onAnalyzeFlashcards = vi.fn().mockResolvedValue({
			deckName: "Default",
			duplicateHandling: "skip",
			operations: []
		});

		const {modal} = createModal({
			noteName: "Algorithms",
			flashcardCount: 3,
			onAnalyzeFlashcards
		});

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		expect(mocks.setTitle).toHaveBeenLastCalledWith("Flashcard Analysis");

		getButton(modal, "Back").click();

		expect(mocks.setTitle).toHaveBeenLastCalledWith("Export to Anki");
		expect(modal.contentEl.textContent).toContain("Algorithms: 3 flashcard(s) found.");
		expect(getButton(modal, "Analyze Flashcards")).toBeDefined();
	});


	it("exports flashcards from the analysis step", async () => {
		const onExport = vi.fn().mockResolvedValue(undefined);

		const onAnalyzeFlashcards = vi.fn().mockResolvedValue({
			deckName: "Default",
			duplicateHandling: "skip",
			operations: []
		});

		const {modal} = createModal({
			onExport,
			onAnalyzeFlashcards
		});

		getButton(modal, "Analyze Flashcards").click();

		await flushPromises();

		getButton(modal, "Export Flashcards").click();

		await flushPromises();

		expect(onExport).toHaveBeenCalledWith("Default", "skip");
		expect(mocks.close).toHaveBeenCalledOnce();
	});
});
