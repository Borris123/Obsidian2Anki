import {
	defineConfig,
} from "vitest/config";

export default defineConfig({
	plugins: [
		{
			name:
				"resolve-obsidian-for-tests",

			resolveId(
				id: string,
			): string | null {

				if (id === "obsidian") {
					return id;
				}

				return null;
			},
		},
	],

	test: {
		coverage: {
			provider: "v8",

			reporter: [
				"text",
				"html",
				"lcov",
			],

			include: [
				"src/**/*.ts",
			],

			exclude: [
				"src/**/*.test.ts",
			],

			thresholds: {
				lines: 85,
				functions: 85,
				statements: 85,
				branches: 80,
			},
		},
	},
});
