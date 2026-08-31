import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";
import {defineConfig, globalIgnores} from "eslint/config";

export default defineConfig(
	globalIgnores([
		"node_modules/**",
		"dist/**",
		"coverage/**",
		"main.js",
		"eslint.config.mts",
		"esbuild.config.mjs",
		"version-bump.mjs",
		"package-lock.json"
	]),

	...obsidianmd.configs.recommended,

	{
		files: [
			"src/**/*.ts",
			"tests/**/*.ts",
			"vitest.config.ts"
		],

		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname
			}
		},

		rules: {
			"obsidianmd/ui/sentence-case": "off"
		}
	}
);
