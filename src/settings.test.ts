import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";


type OnChangeCallback =
	(value: string) => Promise<void>;


interface TextControl {

	setPlaceholder(
		value: string,
	): TextControl;

	setValue(
		value: string,
	): TextControl;

	onChange(
		callback: OnChangeCallback,
	): TextControl;
}


const mocks = vi.hoisted(() => ({

	settingConstructor:
		vi.fn<
			(containerEl: unknown) => void
		>(),

	containerEmpty:
		vi.fn<
			() => void
		>(),

	setName:
		vi.fn<
			(name: string) => void
		>(),

	setDesc:
		vi.fn<
			(description: string) => void
		>(),

	addText:
		vi.fn<
			(
				callback:
				(text: TextControl) =>
					unknown,
			) => void
		>(),

	setPlaceholder:
		vi.fn<
			(value: string) =>
				TextControl
		>(),

	setValue:
		vi.fn<
			(value: string) =>
				TextControl
		>(),

	onChange:
		vi.fn<
			(
				callback:
				OnChangeCallback,
			) => TextControl
		>(),
}));


vi.mock(
	"obsidian",
	() => {

		class PluginSettingTab {

			containerEl: {
				empty: () => void;
			};

			constructor() {

				this.containerEl = {
					empty: () => {
						mocks.containerEmpty();
					},
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
				(text: TextControl) =>
					unknown,
			): this {

				mocks.addText(
					callback,
				);

				const text:
					TextControl = {

					setPlaceholder(
						value: string,
					): TextControl {

						return mocks
							.setPlaceholder(
								value,
							);
					},

					setValue(
						value: string,
					): TextControl {

						return mocks
							.setValue(
								value,
							);
					},

					onChange(
						onChangeCallback:
						OnChangeCallback,
					): TextControl {

						return mocks.onChange(
							onChangeCallback,
						);
					},
				};

				mocks.setPlaceholder
					.mockReturnValue(
						text,
					);

				mocks.setValue
					.mockReturnValue(
						text,
					);

				mocks.onChange
					.mockReturnValue(
						text,
					);

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
	},
);


import {
	AnkiExporterSettingTab,
	DEFAULT_SETTINGS,
} from "./settings";


interface TestPlugin {

	settings: {
		ankiConnectUrl: string;
	};

	saveSettings:
		ReturnType<
			typeof vi.fn<
				() => Promise<void>
			>
		>;
}


function getOnChangeCallback():
	OnChangeCallback {

	const onChangeCall =
		mocks.onChange
			.mock.calls[0];

	if (!onChangeCall) {
		throw new Error(
			"onChange callback was not registered.",
		);
	}

	return onChangeCall[0];
}


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

		let plugin:
			TestPlugin;


		beforeEach(() => {

			vi.clearAllMocks();

			plugin = {
				settings: {
					ankiConnectUrl:
						"http://localhost:9999",
				},

				saveSettings:
					vi.fn<
						() => Promise<void>
					>()
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
					mocks.containerEmpty,
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
					getOnChangeCallback();

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
					getOnChangeCallback();

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
					vi.fn<
						() => Promise<void>
					>(
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
					getOnChangeCallback();

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
