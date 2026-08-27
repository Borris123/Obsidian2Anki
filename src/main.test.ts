import {afterEach, beforeEach, describe, expect, it, vi,} from "vitest";

import type {App, PluginManifest,} from "obsidian";

import type {Flashcard,} from "./flashcards/flashcard";
import AnkiExporterPlugin from "./main";
import {DuplicateHandling} from "./anki/duplicate-handling";


interface TestFile {
	extension: string;
	basename: string;
}

interface TestApp {
	workspace: {
		getActiveFile: ReturnType<typeof vi.fn<() => TestFile | null>>;
	};

	vault: {
		cachedRead: ReturnType<typeof vi.fn<(file: TestFile,) => Promise<string>>>;

		modify: ReturnType<typeof vi.fn<(file: TestFile, content: string,) => Promise<void>>>;
	};
}

interface TestSyncResult {
	created: number;
	updated: number;
	unchanged: number;
	missing: number;
	updatedMarkdown: string;
}

interface RegisteredCommand {
	id: string;
	name: string;
	callback: () => Promise<void>;
}

type RibbonCallback = () => Promise<void>;

type ExportCallback = (deckName: string, duplicateHandling: DuplicateHandling,) => Promise<void>;

type CreateDeckCallback = (deckName: string) => Promise<void>;

type AddSettingTabMock = (tab: unknown) => void;

type AddRibbonIconMock = (icon: string, title: string, callback: RibbonCallback,) => void;

type AddCommandMock = (command: RegisteredCommand) => void;

type LoadDataMock = () => Promise<unknown>;

type SaveDataMock = (data: unknown) => Promise<void>;

type SettingTabConstructorMock = (app: unknown, plugin: unknown,) => void;

type ParseFlashcardsMock = (markdown: string) => Flashcard[];

type AnkiClientConstructorMock = (url: string) => void;

type GetDeckNamesMock = () => Promise<string[]>;

type CreateDeckMock = (deckName: string) => Promise<number>;

type SyncFlashcardsMock = (ankiClient: unknown, deckName: string, markdown: string, flashcards: Flashcard[], duplicateHandling: DuplicateHandling,) => Promise<TestSyncResult>;
type ModalConstructorMock = (app: unknown, noteName: string, decks: string[], flashcardCount: number, onExport: ExportCallback, onCreateDeck: CreateDeckCallback,) => void;


const mocks = vi.hoisted(() => ({
	notice: vi.fn<(message: string) => void>(),

	addSettingTab: vi.fn<AddSettingTabMock>(),

	addRibbonIcon: vi.fn<AddRibbonIconMock>(),

	addCommand: vi.fn<AddCommandMock>(),

	loadData: vi.fn<LoadDataMock>(),

	saveData: vi.fn<SaveDataMock>(),

	settingTabConstructor: vi.fn<SettingTabConstructorMock>(),

	parseFlashcards: vi.fn<ParseFlashcardsMock>(),

	ankiClientConstructor: vi.fn<AnkiClientConstructorMock>(),

	getDeckNames: vi.fn<GetDeckNamesMock>(),

	createDeck: vi.fn<CreateDeckMock>(),

	syncFlashcards: vi.fn<SyncFlashcardsMock>(),

	modalConstructor: vi.fn<ModalConstructorMock>(),

	modalOpen: vi.fn<() => void>(),
}));


vi.mock("obsidian", () => {

	class Plugin {

		app: unknown;

		constructor(app: unknown,) {
			this.app = app;
		}

		addSettingTab(tab: unknown,): void {
			mocks.addSettingTab(tab,);
		}

		addRibbonIcon(icon: string, title: string, callback: RibbonCallback,): void {
			mocks.addRibbonIcon(icon, title, callback,);
		}

		addCommand(command: RegisteredCommand,): void {
			mocks.addCommand(command,);
		}

		loadData(): Promise<unknown> {

			return mocks
				.loadData();
		}

		saveData(data: unknown,): Promise<void> {

			return mocks
				.saveData(data,);
		}
	}

	class Notice {

		constructor(message: string,) {
			mocks.notice(message,);
		}
	}

	return {
		Plugin, Notice,
	};
},);


vi.mock("./settings", () => {

	class AnkiExporterSettingTab {

		constructor(app: unknown, plugin: unknown,) {
			mocks
				.settingTabConstructor(app, plugin,);
		}
	}

	return {
		DEFAULT_SETTINGS: {
			ankiConnectUrl: "http://127.0.0.1:8765",
		},

		AnkiExporterSettingTab,
	};
},);


vi.mock("./flashcards/flashcard-parser", () => ({
	parseFlashcards: mocks.parseFlashcards,
}),);


vi.mock("./sync/sync-flashcards", () => ({
	syncFlashcards: mocks.syncFlashcards,
}),);


vi.mock("./anki/anki-client", () => {

	class AnkiClient {

		constructor(url: string,) {
			mocks
				.ankiClientConstructor(url,);
		}

		getDeckNames(): Promise<string[]> {

			return mocks
				.getDeckNames();
		}

		createDeck(deckName: string,): Promise<number> {

			return mocks
				.createDeck(deckName,);
		}
	}

	return {
		AnkiClient,
	};
},);


vi.mock("./ui/anki-export-modal", () => {

	class AnkiExportModal {

		constructor(app: unknown, noteName: string, decks: string[], flashcardCount: number, onExport: ExportCallback, onCreateDeck: CreateDeckCallback,) {
			mocks.modalConstructor(app, noteName, decks, flashcardCount, onExport, onCreateDeck,);
		}

		open(): void {
			mocks.modalOpen();
		}
	}

	return {
		AnkiExportModal,
	};
},);


function createApp(): TestApp {

	return {
		workspace: {
			getActiveFile: vi.fn<() => TestFile | null>(),
		},

		vault: {
			cachedRead: vi.fn<(file: TestFile,) => Promise<string>>(),

			modify: vi.fn<(file: TestFile, content: string,) => Promise<void>>(),
		},
	};
}


function createPlugin(app: TestApp,): AnkiExporterPlugin {

	return new AnkiExporterPlugin(app as unknown as App, {} as PluginManifest,);
}


function getCommandCallback(): () => Promise<void> {

	const commandCall = mocks.addCommand.mock.calls[0];

	if (!commandCall) {
		throw new Error("Command was not registered.",);
	}

	return commandCall[0].callback;
}


function getRibbonCallback(): RibbonCallback {

	const ribbonCall = mocks.addRibbonIcon.mock.calls[0];

	if (!ribbonCall) {
		throw new Error("Ribbon action was not registered.",);
	}

	return ribbonCall[2];
}


function getModalCall(): Parameters<ModalConstructorMock> {

	const modalCall = mocks.modalConstructor
		.mock.calls
		.at(-1);

	if (!modalCall) {
		throw new Error("Export modal was not created.",);
	}

	return modalCall;
}


function getExportCallback(): ExportCallback {

	return getModalCall()[4];
}


function getCreateDeckCallback(): CreateDeckCallback {

	return getModalCall()[5];
}


describe("AnkiExporterPlugin", () => {

	let app: TestApp;

	const file: TestFile = {

		extension: "md", basename: "algorithms",
	};

	const markdown = "Array :: Collection";

	const flashcards: Flashcard[] = [{
		front: "Array",

		back: "Collection",
	},];

	beforeEach(() => {

		vi.resetAllMocks();

		app = createApp();

		app.workspace
			.getActiveFile
			.mockReturnValue(file,);

		app.vault
			.cachedRead
			.mockResolvedValue(markdown,);

		app.vault
			.modify
			.mockResolvedValue(undefined,);

		mocks.loadData
			.mockResolvedValue(undefined,);

		mocks.saveData
			.mockResolvedValue(undefined,);

		mocks.parseFlashcards
			.mockReturnValue(flashcards,);

		mocks.getDeckNames
			.mockResolvedValue(["Default", "Computer Science",]);

		mocks.createDeck
			.mockResolvedValue(123,);

		mocks.syncFlashcards
			.mockResolvedValue({
				created: 0, updated: 0, unchanged: 1, missing: 0,

				updatedMarkdown: markdown,
			});

		vi.spyOn(console, "error",).mockImplementation(() => undefined,);
	});


	afterEach(() => {
		vi.restoreAllMocks();
	});


	it("loads settings and registers plugin actions", async () => {

		const plugin = createPlugin(app,);

		await plugin.onload();

		expect(mocks.loadData,).toHaveBeenCalledOnce();

		expect(mocks.addSettingTab,).toHaveBeenCalledOnce();

		const ribbonCall = mocks.addRibbonIcon.mock.calls[0];

		expect(ribbonCall,).toBeDefined();

		if (!ribbonCall) {
			throw new Error("Ribbon action was not registered.",);
		}

		expect(ribbonCall[0],).toBe("layers",);

		expect(ribbonCall[1],).toBe("Export current note to Anki",);

		expect(typeof ribbonCall[2],).toBe("function",);

		const commandCall = mocks.addCommand.mock.calls[0];

		expect(commandCall,).toBeDefined();

		if (!commandCall) {
			throw new Error("Command was not registered.",);
		}

		const command = commandCall[0];

		expect(command.id,).toBe("export-current-note-to-anki",);

		expect(command.name,).toBe("Export current note to Anki",);

		expect(typeof command.callback,).toBe("function",);
	},);


	it("shows a notice when no note is open", async () => {

		app.workspace
			.getActiveFile
			.mockReturnValue(null,);

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getCommandCallback()();

		expect(mocks.notice,).toHaveBeenCalledWith("No note is currently open.",);

		expect(app.vault.cachedRead,).not
			.toHaveBeenCalled();
	},);


	it("shows a notice when the active file is not Markdown", async () => {

		app.workspace
			.getActiveFile
			.mockReturnValue({
				extension: "pdf",

				basename: "document",
			});

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getCommandCallback()();

		expect(mocks.notice,).toHaveBeenCalledWith("The current file is not a Markdown note.",);

		expect(app.vault.cachedRead,).not
			.toHaveBeenCalled();
	},);


	it("shows a notice when no flashcards are found", async () => {

		mocks.parseFlashcards
			.mockReturnValue([],);

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getCommandCallback()();

		expect(mocks.parseFlashcards,).toHaveBeenCalledWith(markdown,);

		expect(mocks.notice,).toHaveBeenCalledWith("No flashcards found in the current note.",);

		expect(mocks.getDeckNames,).not
			.toHaveBeenCalled();
	},);


	it("shows an error when Anki cannot be reached", async () => {

		mocks.getDeckNames
			.mockRejectedValue(new Error("Connection refused",),);

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getCommandCallback()();

		expect(mocks.notice,).toHaveBeenCalledWith("Could not connect to Anki. Is Anki running?",);

		expect(mocks.modalOpen,).not
			.toHaveBeenCalled();
	},);


	it("opens the export modal with available decks", async () => {

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getCommandCallback()();

		expect(mocks.ankiClientConstructor,).toHaveBeenCalledWith("http://127.0.0.1:8765",);

		const modalCall = getModalCall();

		expect(modalCall[1],).toBe("algorithms",);

		expect(modalCall[2],).toEqual(["Default", "Computer Science",]);

		expect(modalCall[3],).toBe(1);

		expect(typeof modalCall[4],).toBe("function",);

		expect(typeof modalCall[5],).toBe("function",);

		expect(mocks.modalOpen,).toHaveBeenCalledOnce();
	},);


	it("also opens the export modal through the ribbon action", async () => {

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getRibbonCallback()();

		expect(mocks.modalOpen,).toHaveBeenCalledOnce();
	},);


	it("syncs flashcards when export is confirmed", async () => {

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getCommandCallback()();

		await getExportCallback()(
			"Computer Science",
			"skip",
		);

		const syncCall = mocks.syncFlashcards.mock.calls[0];

		expect(syncCall,).toBeDefined();

		if (!syncCall) {
			throw new Error("Sync was not called.",);
		}

		expect(syncCall[1],).toBe("Computer Science",);

		expect(syncCall[2],).toBe(markdown,);

		expect(syncCall[3],).toEqual(flashcards,);
	},);


	it("writes changed Markdown back to the vault", async () => {

		const updatedMarkdown = `<!-- anki-note-id:100 -->\n` + markdown;

		mocks.syncFlashcards
			.mockResolvedValue({
				created: 1, updated: 0, unchanged: 0, missing: 0,

				updatedMarkdown,
			});

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getCommandCallback()();

		await getExportCallback()(
			"Default",
			"skip",
		);

		expect(app.vault.modify,).toHaveBeenCalledWith(file, updatedMarkdown,);

		expect(mocks.notice,).toHaveBeenCalledWith("Sync complete: 1 created, 0 updated, 0 unchanged.",);
	},);


	it("does not rewrite unchanged Markdown", async () => {

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getCommandCallback()();

		await getExportCallback()(
			"Default",
			"skip",
		);

		expect(app.vault.modify,).not
			.toHaveBeenCalled();

		expect(mocks.notice,).toHaveBeenCalledWith("Sync complete: 0 created, 0 updated, 1 unchanged.",);
	},);


	it("includes missing notes in the result notice", async () => {

		mocks.syncFlashcards
			.mockResolvedValue({
				created: 1, updated: 2, unchanged: 3, missing: 4,

				updatedMarkdown: markdown,
			});

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getCommandCallback()();

		await getExportCallback()(
			"Default",
			"skip",
		);

		expect(mocks.notice,).toHaveBeenCalledWith("Sync complete: 1 created, 2 updated, 3 unchanged, 4 missing.",);
	},);


	it("handles sync errors", async () => {

		mocks.syncFlashcards
			.mockRejectedValue(new Error("Sync failed",),);

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getCommandCallback()();

		await expect(getExportCallback()(
			"Default",
			"skip",
		)).rejects.toThrow("Sync failed",);

		expect(mocks.notice,).toHaveBeenCalledWith("Could not sync flashcards with Anki.",);
	},);


	it("creates a new Anki deck", async () => {

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getCommandCallback()();

		await getCreateDeckCallback()("Algorithms",);

		expect(mocks.createDeck,).toHaveBeenCalledWith("Algorithms",);
	},);


	it("shows a notice and rethrows when deck creation fails", async () => {

		mocks.createDeck
			.mockRejectedValue(new Error("Create failed",),);

		const plugin = createPlugin(app,);

		await plugin.onload();

		await getCommandCallback()();

		await expect(getCreateDeckCallback()("Algorithms",),).rejects.toThrow("Create failed",);

		expect(mocks.notice,).toHaveBeenCalledWith("Could not create the Anki deck.",);
	},);


	it("merges loaded settings with defaults", async () => {

		mocks.loadData
			.mockResolvedValue({
				ankiConnectUrl: "http://localhost:9999",
			});

		const plugin = createPlugin(app,);

		await plugin.loadSettings();

		expect(plugin.settings,).toEqual({
			ankiConnectUrl: "http://localhost:9999",
		});
	},);


	it("uses default settings when loaded data is invalid", async () => {

		mocks.loadData
			.mockResolvedValue(null,);

		const plugin = createPlugin(app,);

		await plugin.loadSettings();

		expect(plugin.settings,).toEqual({
			ankiConnectUrl: "http://127.0.0.1:8765",
		});
	},);


	it("saves the current settings", async () => {

		const plugin = createPlugin(app,);

		plugin.settings = {
			ankiConnectUrl: "http://localhost:9999",
		};

		await plugin.saveSettings();

		expect(mocks.saveData,).toHaveBeenCalledWith({
			ankiConnectUrl: "http://localhost:9999",
		});
	},);
},);
