import {defineConfig,} from "vitest/config";

export default defineConfig({
	plugins: [{
		name: "resolve-obsidian-for-tests",

		resolveId(id: string,): string | null {

			if (id === "obsidian") {
				return id;
			}

			return null;
		},
	},],

	test: {
		coverage: {
			provider: "v8",

			reportsDirectory: "coverage/report",

			reporter: ["text", "html", "lcov",],

			include: ["src/**/*.ts",],

			exclude: ["src/**/*.test.ts",],

			thresholds: {
				lines: 80, functions: 80, statements: 80, branches: 70,
			},
		},
	},
});
