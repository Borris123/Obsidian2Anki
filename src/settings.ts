import {
	App,
	PluginSettingTab,
	Setting,
} from "obsidian";

import type AnkiExporterPlugin
	from "./main";

export interface AnkiExporterSettings {
	ankiConnectUrl: string;
}

export const DEFAULT_SETTINGS:
	AnkiExporterSettings = {

	ankiConnectUrl:
		"http://127.0.0.1:8765",
};

export class AnkiExporterSettingTab
	extends PluginSettingTab {

	constructor(
		app: App,
		private readonly plugin:
		AnkiExporterPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("AnkiConnect URL")
			.setDesc(
				"URL used to communicate with AnkiConnect.",
			)
			.addText(text =>
				text
					.setPlaceholder(
						"http://127.0.0.1:8765",
					)
					.setValue(
						this.plugin
							.settings
							.ankiConnectUrl,
					)
					.onChange(
						async value => {
							this.plugin
								.settings
								.ankiConnectUrl =
								value.trim();

							await this.plugin
								.saveSettings();
						},
					),
			);
	}
}
