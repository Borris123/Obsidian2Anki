import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

import type {
	App,
	PluginManifest,
} from "obsidian";

/*
 * vi.mock() is hoisted by Vitest.
 * Therefore shared mocks must also be hoisted.
 */
const mocks = vi.hoisted(() => ({
	notice: vi.fn(),

	addSettingTab: vi.fn(),
	addRibbonIcon: vi.fn(),
	addCommand: vi.fn(),

	loadData: vi.fn(),
	saveData: vi.fn(),

	settingTabConstructor: vi.fn(),

	parseFlashcards: vi.fn(),

	ankiClientConstructor: vi.fn(),
	getDeckNames: vi.fn(),
	createDeck: vi.fn(),

	syncFlashcards: vi.fn(),

	modalConstructor: vi.fn(),
	modalOpen: vi.fn(),
}));

/*
 * Mock the Obsidian runtime.
 */
vi.mock("obsidian", () => {

	class Plugin {
		app: App;

		constructor(
			app: App,
		) {
			this.app = app;
		}

		addSettingTab =
			mocks.addSettingTab;

		addRibbonIcon =
			mocks.addRibbonIcon;

		addCommand =
			mocks.addCommand;

		loadData =
			mocks.loadData;

		saveData =
			mocks.saveData;
	}

	class Notice {
		constructor(
			message: string,
		) {
			mocks.notice(
				message,
			);
		}
	}

	return {
		Plugin,
		Notice,
	};
});

vi.mock("./settings", () => {

	class AnkiExporterSettingTab {
		constructor(
			...args: unknown[]
		) {
			mocks.settingTabConstructor(
				...args,
			);
		}
	}

	return {
		DEFAULT_SETTINGS: {
			ankiConnectUrl:
				"http://127.0.0.1:8765",
		},

		AnkiExporterSettingTab,
	};
});

vi.mock(
	"./flashcards/flashcard-parser",
	() => ({
		parseFlashcards:
		mocks.parseFlashcards,
	}),
);

vi.mock(
	"./sync/sync-flashcards",
	() => ({
		syncFlashcards:
		mocks.syncFlashcards,
	}),
);

vi.mock(
	"./anki/anki-client",
	() => {

		class AnkiClient {

			constructor(
				url: string,
			) {
				mocks
					.ankiClientConstructor(
						url,
					);
			}

			getDeckNames =
				mocks.getDeckNames;

			createDeck =
				mocks.createDeck;
		}

		return {
			AnkiClient,
		};
	},
);

vi.mock(
	"./ui/anki-export-modal",
	() => {

		class AnkiExportModal {

			constructor(
				...args: unknown[]
			) {
				mocks.modalConstructor(
					...args,
				);
			}

			open(): void {
				mocks.modalOpen();
			}
		}

		return {
			AnkiExportModal,
		};
	},
);

import AnkiExporterPlugin
	from "./main";

interface TestApp {
	workspace: {
		getActiveFile:
			ReturnType<typeof vi.fn>;
	};

	vault: {
		cachedRead:
			ReturnType<typeof vi.fn>;

		modify:
			ReturnType<typeof vi.fn>;
	};
}

type ExportCallback =
	(deckName: string) =>
		Promise<void>;

function createApp():
	TestApp {

	return {
		workspace: {
			getActiveFile:
				vi.fn(),
		},

		vault: {
			cachedRead:
				vi.fn(),

			modify:
				vi.fn(),
		},
	};
}

function createPlugin(
	app: TestApp,
): AnkiExporterPlugin {

	return new AnkiExporterPlugin(
		app as unknown as App,
		{} as PluginManifest,
	);
}

function getCommandCallback():
	() => Promise<void> {

	const command =
		mocks.addCommand
			.mock.calls[0]![0] as {
			callback:
				() => Promise<void>;
		};

	return command.callback;
}

function getRibbonCallback():
	() => Promise<void> {

	return mocks.addRibbonIcon
		.mock.calls[0]![2] as
		() => Promise<void>;
}

function getExportCallback(): ExportCallback {
	const modalCall =
		mocks.modalConstructor.mock.calls.at(-1);

	if (!modalCall) {
		throw new Error("Modal constructor was not called");
	}

	return modalCall[4] as ExportCallback;
}

function getCreateDeckCallback(): ExportCallback {
	const modalCall =
		mocks.modalConstructor.mock.calls.at(-1);

	if (!modalCall) {
		throw new Error("Modal constructor was not called");
	}

	return modalCall[5] as ExportCallback;
}

describe(
	"AnkiExporterPlugin",
	() => {

		let app: TestApp;

		const file = {
			extension: "md",
			basename: "algorithms",
		};

		const markdown =
			"Array :: Collection";

		const flashcards = [
			{
				front: "Array",
				back: "Collection",
			},
		];

		beforeEach(() => {
			vi.clearAllMocks();

			app =
				createApp();

			app.workspace
				.getActiveFile
				.mockReturnValue(
					file,
				);

			app.vault
				.cachedRead
				.mockResolvedValue(
					markdown,
				);

			mocks.loadData
				.mockResolvedValue(
					undefined,
				);

			mocks.parseFlashcards
				.mockReturnValue(
					flashcards,
				);

			mocks.getDeckNames
				.mockResolvedValue([
					"Default",
					"Computer Science",
				]);

			mocks.createDeck
				.mockResolvedValue(
					123,
				);

			mocks.syncFlashcards
				.mockResolvedValue({
					created: 0,
					updated: 0,
					unchanged: 1,
					missing: 0,
					updatedMarkdown:
					markdown,
				});

			vi.spyOn(
				console,
				"error",
			).mockImplementation(
				() => undefined,
			);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads settings and registers plugin actions",
			async () => {

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				expect(
					mocks.loadData,
				).toHaveBeenCalledOnce();

				expect(
					mocks.addSettingTab,
				).toHaveBeenCalledOnce();

				expect(
					mocks.addRibbonIcon,
				).toHaveBeenCalledWith(
					"layers",
					"Export current note to Anki",
					expect.any(
						Function,
					),
				);

				expect(
					mocks.addCommand,
				).toHaveBeenCalledWith({
					id:
						"export-current-note-to-anki",

					name:
						"Export current note to Anki",

					callback:
						expect.any(
							Function,
						),
				});
			},
		);

		it(
			"shows a notice when no note is open",
			async () => {

				app.workspace
					.getActiveFile
					.mockReturnValue(
						null,
					);

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getCommandCallback()();

				expect(
					mocks.notice,
				).toHaveBeenCalledWith(
					"No note is currently open.",
				);

				expect(
					app.vault.cachedRead,
				).not.toHaveBeenCalled();
			},
		);

		it(
			"shows a notice when the active file is not Markdown",
			async () => {

				app.workspace
					.getActiveFile
					.mockReturnValue({
						extension: "pdf",
						basename:
							"document",
					});

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getCommandCallback()();

				expect(
					mocks.notice,
				).toHaveBeenCalledWith(
					"The current file is not a Markdown note.",
				);

				expect(
					app.vault.cachedRead,
				).not.toHaveBeenCalled();
			},
		);

		it(
			"shows a notice when no flashcards are found",
			async () => {

				mocks.parseFlashcards
					.mockReturnValue(
						[],
					);

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getCommandCallback()();

				expect(
					mocks.parseFlashcards,
				).toHaveBeenCalledWith(
					markdown,
				);

				expect(
					mocks.notice,
				).toHaveBeenCalledWith(
					"No flashcards found in the current note.",
				);

				expect(
					mocks.getDeckNames,
				).not.toHaveBeenCalled();
			},
		);

		it(
			"shows an error when Anki cannot be reached",
			async () => {

				mocks.getDeckNames
					.mockRejectedValue(
						new Error(
							"Connection refused",
						),
					);

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getCommandCallback()();

				expect(
					mocks.notice,
				).toHaveBeenCalledWith(
					"Could not connect to Anki. Is Anki running?",
				);

				expect(
					mocks.modalOpen,
				).not.toHaveBeenCalled();

				expect(
					console.error,
				).toHaveBeenCalledWith(
					"Could not connect to Anki:",
					expect.any(
						Error,
					),
				);
			},
		);

		it(
			"opens the export modal with available decks",
			async () => {

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getCommandCallback()();

				expect(
					mocks
						.ankiClientConstructor,
				).toHaveBeenCalledWith(
					"http://127.0.0.1:8765",
				);

				expect(
					mocks.modalConstructor,
				).toHaveBeenCalledWith(
					expect.anything(),
					"algorithms",
					[
						"Default",
						"Computer Science",
					],
					1,
					expect.any(
						Function,
					),
					expect.any(
						Function,
					),
				);

				expect(
					mocks.modalOpen,
				).toHaveBeenCalledOnce();
			},
		);

		it(
			"also opens the export modal through the ribbon action",
			async () => {

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getRibbonCallback()();

				expect(
					mocks.modalOpen,
				).toHaveBeenCalledOnce();
			},
		);

		it(
			"syncs flashcards when export is confirmed",
			async () => {

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getCommandCallback()();

				const exportCallback =
					getExportCallback();

				await exportCallback(
					"Computer Science",
				);

				expect(
					mocks.syncFlashcards,
				).toHaveBeenCalledWith(
					expect.anything(),
					"Computer Science",
					markdown,
					flashcards,
				);
			},
		);

		it(
			"writes changed Markdown back to the vault",
			async () => {

				const updatedMarkdown =
					`<!-- anki-note-id:100 -->\n` +
					markdown;

				mocks.syncFlashcards
					.mockResolvedValue({
						created: 1,
						updated: 0,
						unchanged: 0,
						missing: 0,
						updatedMarkdown,
					});

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getCommandCallback()();

				await getExportCallback()(
					"Computer Science",
				);

				expect(
					app.vault.modify,
				).toHaveBeenCalledWith(
					file,
					updatedMarkdown,
				);

				expect(
					mocks.notice,
				).toHaveBeenCalledWith(
					"Sync complete: 1 created, 0 updated, 0 unchanged.",
				);
			},
		);

		it(
			"does not rewrite the file when Markdown did not change",
			async () => {

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getCommandCallback()();

				await getExportCallback()(
					"Computer Science",
				);

				expect(
					app.vault.modify,
				).not.toHaveBeenCalled();

				expect(
					mocks.notice,
				).toHaveBeenCalledWith(
					"Sync complete: 0 created, 0 updated, 1 unchanged.",
				);
			},
		);

		it(
			"includes missing notes in the sync result notice",
			async () => {

				mocks.syncFlashcards
					.mockResolvedValue({
						created: 1,
						updated: 2,
						unchanged: 3,
						missing: 4,
						updatedMarkdown:
						markdown,
					});

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getCommandCallback()();

				await getExportCallback()(
					"Default",
				);

				expect(
					mocks.notice,
				).toHaveBeenCalledWith(
					"Sync complete: 1 created, 2 updated, 3 unchanged, 4 missing.",
				);
			},
		);

		it(
			"handles sync errors",
			async () => {

				mocks.syncFlashcards
					.mockRejectedValue(
						new Error(
							"Sync failed",
						),
					);

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getCommandCallback()();

				await getExportCallback()(
					"Default",
				);

				expect(
					console.error,
				).toHaveBeenCalledWith(
					"Could not sync flashcards:",
					expect.any(
						Error,
					),
				);

				expect(
					mocks.notice,
				).toHaveBeenCalledWith(
					"Could not sync flashcards with Anki.",
				);
			},
		);

		it(
			"creates a new Anki deck",
			async () => {

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getCommandCallback()();

				await getCreateDeckCallback()(
					"Algorithms",
				);

				expect(
					mocks.createDeck,
				).toHaveBeenCalledWith(
					"Algorithms",
				);
			},
		);

		it(
			"shows a notice and rethrows when deck creation fails",
			async () => {

				mocks.createDeck
					.mockRejectedValue(
						new Error(
							"Create failed",
						),
					);

				const plugin =
					createPlugin(
						app,
					);

				await plugin.onload();

				await getCommandCallback()();

				await expect(
					getCreateDeckCallback()(
						"Algorithms",
					),
				).rejects.toThrow(
					"Create failed",
				);

				expect(
					mocks.notice,
				).toHaveBeenCalledWith(
					"Could not create the Anki deck.",
				);

				expect(
					console.error,
				).toHaveBeenCalledWith(
					"Could not create Anki deck:",
					expect.any(
						Error,
					),
				);
			},
		);

		it(
			"merges loaded settings with defaults",
			async () => {

				mocks.loadData
					.mockResolvedValue({
						ankiConnectUrl:
							"http://localhost:9999",
					});

				const plugin =
					createPlugin(
						app,
					);

				await plugin.loadSettings();

				expect(
					plugin.settings,
				).toEqual({
					ankiConnectUrl:
						"http://localhost:9999",
				});
			},
		);

		it(
			"uses default settings when loaded data is invalid",
			async () => {

				mocks.loadData
					.mockResolvedValue(
						null,
					);

				const plugin =
					createPlugin(
						app,
					);

				await plugin.loadSettings();

				expect(
					plugin.settings,
				).toEqual({
					ankiConnectUrl:
						"http://127.0.0.1:8765",
				});
			},
		);

		it(
			"saves the current settings",
			async () => {

				const plugin =
					createPlugin(
						app,
					);

				plugin.settings = {
					ankiConnectUrl:
						"http://localhost:9999",
				};

				await plugin.saveSettings();

				expect(
					mocks.saveData,
				).toHaveBeenCalledWith({
					ankiConnectUrl:
						"http://localhost:9999",
				});
			},
		);
	},
);
