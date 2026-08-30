import {describe, expect, it, vi} from "vitest";

import {AnkiExporterSettingTab, DEFAULT_SETTINGS} from "./settings";


vi.mock("obsidian", () => {
	class PluginSettingTab {
		constructor() {}
	}

	return {
		PluginSettingTab
	};
});


describe("DEFAULT_SETTINGS", () => {
	it("uses the default AnkiConnect URL", () => {
		expect(DEFAULT_SETTINGS).toEqual({
			ankiConnectUrl: "http://127.0.0.1:8765"
		});
	});
});


describe("AnkiExporterSettingTab", () => {
	it("defines the AnkiConnect URL setting", () => {
		const settingTab = new AnkiExporterSettingTab({} as never, {} as never);

		expect(settingTab.getSettingDefinitions()).toEqual([
			{
				name: "AnkiConnect URL",
				desc: "URL used to communicate with AnkiConnect.",
				control: {
					type: "text",
					key: "ankiConnectUrl",
					placeholder: "http://127.0.0.1:8765"
				}
			}
		]);
	});
});
