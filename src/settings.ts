import {App, PluginSettingTab} from "obsidian";

import type AnkiExporterPlugin from "./main";


export interface AnkiExporterSettings {
	ankiConnectUrl: string;
}


export const DEFAULT_SETTINGS: AnkiExporterSettings = {
	ankiConnectUrl: "http://127.0.0.1:8765"
};


export class AnkiExporterSettingTab extends PluginSettingTab {

	constructor(app: App, private readonly plugin: AnkiExporterPlugin) {
		super(app, plugin);
	}


	getSettingDefinitions() {
		return [
			{
				name: "AnkiConnect URL",
				desc: "URL used to communicate with AnkiConnect.",
				control: {
					type: "text" as const,
					key: "ankiConnectUrl",
					placeholder: "http://127.0.0.1:8765"
				}
			}
		];
	}
}
