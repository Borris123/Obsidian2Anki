import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
	settingConstructor: vi.fn(),

	setName: vi.fn(),
	setDesc: vi.fn(),
	addText: vi.fn(),

	setPlaceholder: vi.fn(),
	setValue: vi.fn(),
	onChange: vi.fn(),
}));

vi.mock("obsidian", () => {

	class PluginSettingTab {

		containerEl: {
			empty: ReturnType<typeof vi.fn>;
		};

		constructor() {
			this.containerEl = {
				empty: vi.fn(),
			};
		}
	}

	class Setting {

		constructor(
			containerEl: unknown,
		) {
			mocks.settingConstructor(
				containerEl,
			);
		}

		setName(
			name: string,
		): this {

			mocks.setName(
				name,
			);

			return this;
		}

		setDesc(
			description: string,
		): this {

			mocks.setDesc(
				description,
			);

			return this;
		}

		addText(
			callback:
			(text: {
				setPlaceholder:
					(value: string) =>
						unknown;

				setValue:
					(value: string) =>
						unknown;

				onChange:
					(
						callback:
						(value: string) =>
							Promise<void>,
					) => unknown;
			}) => unknown,
		): this {

			mocks.addText(
				callback,
			);

			const text = {
				setPlaceholder:
				mocks.setPlaceholder,

				setValue:
				mocks.setValue,

				onChange:
				mocks.onChange,
			};

			mocks.setPlaceholder
				.mockReturnValue(text);

			mocks.setValue
				.mockReturnValue(text);

			mocks.onChange
				.mockReturnValue(text);

			callback(
				text,
			);

			return this;
		}
	}

	return {
		PluginSettingTab,
		Setting,
	};
});

import {
	AnkiExporterSettingTab,
	DEFAULT_SETTINGS,
} from "./settings";

describe(
	"DEFAULT_SETTINGS",
	() => {

		it(
			"uses the default AnkiConnect URL",
			() => {

				expect(
					DEFAULT_SETTINGS,
				).toEqual({
					ankiConnectUrl:
						"http://127.0.0.1:8765",
				});
			},
		);
	},
);

describe(
	"AnkiExporterSettingTab",
	() => {

		let plugin: {
			settings: {
				ankiConnectUrl: string;
			};

			saveSettings:
				ReturnType<typeof vi.fn>;
		};

		beforeEach(() => {

			vi.clearAllMocks();

			plugin = {
				settings: {
					ankiConnectUrl:
						"http://localhost:9999",
				},

				saveSettings:
					vi.fn()
						.mockResolvedValue(
							undefined,
						),
			};
		});

		it(
			"clears the settings container before rendering",
			() => {

				const settingTab =
					new AnkiExporterSettingTab(
						{} as never,
						plugin as never,
					);

				settingTab.display();

				expect(
					settingTab
						.containerEl
						.empty,
				).toHaveBeenCalledOnce();
			},
		);

		it(
			"creates the AnkiConnect URL setting",
			() => {

				const settingTab =
					new AnkiExporterSettingTab(
						{} as never,
						plugin as never,
					);

				settingTab.display();

				expect(
					mocks.setName,
				).toHaveBeenCalledWith(
					"AnkiConnect URL",
				);

				expect(
					mocks.setDesc,
				).toHaveBeenCalledWith(
					"URL used to communicate with AnkiConnect.",
				);
			},
		);

		it(
			"uses the current AnkiConnect URL as input value",
			() => {

				const settingTab =
					new AnkiExporterSettingTab(
						{} as never,
						plugin as never,
					);

				settingTab.display();

				expect(
					mocks.setPlaceholder,
				).toHaveBeenCalledWith(
					"http://127.0.0.1:8765",
				);

				expect(
					mocks.setValue,
				).toHaveBeenCalledWith(
					"http://localhost:9999",
				);
			},
		);

		it(
			"trims a changed AnkiConnect URL",
			async () => {

				const settingTab =
					new AnkiExporterSettingTab(
						{} as never,
						plugin as never,
					);

				settingTab.display();

				const onChangeCallback =
					mocks.onChange
						.mock.calls[0]![0] as
						(
							value: string,
						) => Promise<void>;

				await onChangeCallback(
					"  http://localhost:8765  ",
				);

				expect(
					plugin
						.settings
						.ankiConnectUrl,
				).toBe(
					"http://localhost:8765",
				);
			},
		);

		it(
			"saves settings after the URL changes",
			async () => {

				const settingTab =
					new AnkiExporterSettingTab(
						{} as never,
						plugin as never,
					);

				settingTab.display();

				const onChangeCallback =
					mocks.onChange
						.mock.calls[0]![0] as
						(
							value: string,
						) => Promise<void>;

				await onChangeCallback(
					"http://localhost:8765",
				);

				expect(
					plugin.saveSettings,
				).toHaveBeenCalledOnce();
			},
		);

		it(
			"stores the trimmed URL before saving settings",
			async () => {

				plugin.saveSettings =
					vi.fn(
						async () => {

							expect(
								plugin
									.settings
									.ankiConnectUrl,
							).toBe(
								"http://localhost:8765",
							);
						},
					);

				const settingTab =
					new AnkiExporterSettingTab(
						{} as never,
						plugin as never,
					);

				settingTab.display();

				const onChangeCallback =
					mocks.onChange
						.mock.calls[0]![0] as
						(
							value: string,
						) => Promise<void>;

				await onChangeCallback(
					"  http://localhost:8765  ",
				);

				expect(
					plugin.saveSettings,
				).toHaveBeenCalledOnce();
			},
		);
	},
);
