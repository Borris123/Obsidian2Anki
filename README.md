# Obsidian2Anki

[![codecov](https://codecov.io/gh/Borris123/Obsidian2Anki/branch/main/graph/badge.svg)](https://codecov.io/gh/Borris123/Obsidian2Anki)

Obsidian2Anki is an Obsidian plugin that exports flashcards from Markdown notes directly to Anki.

Flashcards are defined using a simple key-value syntax:

```md
Question :: Answer
```

The plugin parses the currently opened Obsidian note, detects all flashcards, and exports them to a selected Anki deck using [AnkiConnect](https://ankiweb.net/shared/info/2055492159).

## Features

* Export flashcards directly from the currently opened Obsidian note
* Simple `Question :: Answer` syntax
* Integration with Anki through AnkiConnect
* Select an existing Anki deck before exporting
* Search through available Anki decks
* Create new Anki decks directly from Obsidian
* Export all detected flashcards at once
* Ribbon icon for quick access
* Command Palette integration
* Configurable AnkiConnect URL
* Basic error handling for unavailable Anki instances
* Unit-tested Markdown flashcard parser

## Example

Given the following Obsidian note:

```md
# Arrays

Array :: A contiguous collection of elements.

Index :: The position of an element inside an array.

Random Access :: Direct access to an element using its index.

Array Access Complexity :: O(1)
```

Obsidian2Anki detects four flashcards.

The resulting Anki cards will contain:

```text
Front:
Array

Back:
A contiguous collection of elements.
```

and:

```text
Front:
Array Access Complexity

Back:
O(1)
```

## Flashcard Syntax

A flashcard must use the following format:

```text
Question :: Answer
```

There must be exactly one space before and after `::`.

### Valid

```md
What is an array? :: A collection of elements.

Array access complexity :: O(1)

Binary search complexity :: O(log n)
```

### Ignored

Normal Markdown content is ignored:

```md
# Arrays

This is normal text.

## Complexity
```

C++ scope operators are also not interpreted as flashcards:

```cpp
std::vector<int> values;
```

This is possible because the plugin specifically looks for:

```text
 :: 
```

instead of simply:

```text
::
```

## Requirements

Before using the plugin, the following applications are required:

* Obsidian
* Anki Desktop
* AnkiConnect

Anki must be running while exporting flashcards.

By default, AnkiConnect is expected to be available at:

```text
http://127.0.0.1:8765
```

The URL can be changed in the Obsidian plugin settings.

## Installing AnkiConnect

1. Open Anki.
2. Go to `Tools`.
3. Open `Add-ons`.
4. Select `Get Add-ons`.
5. Install AnkiConnect using the add-on code:

```text
2055492159
```

6. Restart Anki.

## Usage

### Export using the Ribbon

1. Open Anki.
2. Open a Markdown note in Obsidian.
3. Add flashcards using the `Question :: Answer` syntax.
4. Click the Obsidian2Anki icon in the left ribbon.
5. Search for or select an Anki deck.
6. Optionally create a new deck.
7. Click `Export`.

### Export using the Command Palette

Open the Obsidian Command Palette:

```text
Ctrl + P
```

Search for:

```text
Export current note to Anki
```

The same export dialog will open.

## Deck Selection

The export dialog loads the available Anki decks through AnkiConnect.

Users can:

* select an existing deck
* search for a deck
* create a new deck
* select the newly created deck immediately
* export all detected flashcards to the selected deck

Nested Anki decks are supported.

For example:

```text
Computer Science
Computer Science::Algorithms
Computer Science::Data Structures
University::Semester 3::Databases
```

## Project Structure

```text
src/
├── anki/
│   ├── anki-client.ts
│   └── anki-response.ts
│
├── flashcards/
│   ├── flashcard.ts
│   ├── flashcard-parser.ts
│   └── flashcard-parser.test.ts
│
├── ui/
│   └── anki-export-modal.ts
│
├── main.ts
└── settings.ts

styles.css
manifest.json
package.json
tsconfig.json
esbuild.config.mjs
```

### Responsibilities

#### `main.ts`

Main plugin entry point.

Responsible for:

* loading plugin settings
* registering commands
* registering the ribbon icon
* reading the active Obsidian note
* coordinating parsing and exporting
* opening the export modal

#### `flashcard-parser.ts`

Parses Markdown content and converts supported lines into flashcards.

```text
Markdown
   ↓
FlashcardParser
   ↓
Flashcard[]
```

#### `anki-client.ts`

Contains the integration with AnkiConnect.

Currently responsible for:

```text
getDeckNames()
createDeck()
addFlashcards()
```

#### `anki-export-modal.ts`

Contains the export user interface.

Responsible for:

* displaying the number of detected flashcards
* searching decks
* selecting decks
* creating decks
* starting an export

The modal does not directly communicate with AnkiConnect.

This keeps the UI separated from the Anki integration.

## Architecture

The basic application flow is:

```text
Obsidian Markdown Note
        │
        ▼
Flashcard Parser
        │
        ▼
Flashcard[]
        │
        ▼
Export Modal
        │
        ├── Search Deck
        ├── Select Deck
        └── Create Deck
        │
        ▼
Anki Client
        │
        ▼
AnkiConnect
        │
        ▼
Anki
```

The responsibilities are intentionally separated:

```text
UI
↓
Plugin orchestration
↓
Domain model
↓
Anki integration
```

This makes individual components easier to test and extend.

## Development

### Prerequisites

Install:

* Node.js
* npm
* Obsidian
* Anki
* AnkiConnect

Clone the repository:

```bash
git clone <repository-url>
cd Obsidian2Anki
```

Install dependencies:

```bash
npm install
```

## Development Build

Start esbuild in watch mode:

```bash
npm run dev
```

The TypeScript source code is compiled into:

```text
main.js
```

Obsidian executes `main.js`, not the TypeScript source files directly.

After making changes, reload the plugin inside Obsidian.

A typical development workflow is:

```text
Edit TypeScript
      ↓
Save
      ↓
esbuild
      ↓
main.js
      ↓
Reload Obsidian plugin
      ↓
Test
```

## Production Build

Run:

```bash
npm run build
```

This performs the TypeScript checks and creates the production JavaScript bundle.

## Tests

Run the unit tests with:

```bash
npm test
```

The Markdown parser is tested independently from Obsidian and Anki.

Example test cases include:

* parsing valid flashcards
* ignoring normal Markdown
* ignoring empty questions
* ignoring empty answers
* ignoring C++ scope operators such as `std::vector`

## Plugin Development Vault

It is recommended to use a separate Obsidian vault while developing the plugin.

The plugin should be available under:

```text
TestVault/
└── .obsidian/
    └── plugins/
        └── Obsidian2Anki/
            ├── main.js
            ├── manifest.json
            └── styles.css
```

The complete development repository can also be placed directly inside the plugin directory.

## Settings

The plugin currently supports configuration of the AnkiConnect URL.

Default:

```text
http://127.0.0.1:8765
```

This can be changed under the Obsidian plugin settings.

## Error Handling

The plugin currently handles common problems such as:

```text
No Markdown note open
No flashcards found
Anki not running
AnkiConnect unavailable
No Anki decks available
Deck creation failure
Flashcard export failure
```

Errors are displayed through Obsidian notices and additional details are logged to the developer console.

## Technology

The project uses:

* TypeScript
* Obsidian Plugin API
* AnkiConnect
* Vitest
* esbuild
* npm

## Why This Project Exists

Obsidian is useful for writing structured study notes, while Anki is useful for long-term active recall.

Maintaining the same information manually in both applications creates unnecessary duplication.

Obsidian2Anki aims to make a workflow like this possible:

```text
Learn topic
    ↓
Write structured Obsidian notes
    ↓
Add important facts as:

Question :: Answer

    ↓
Export
    ↓
Review in Anki
```

The Markdown notes remain the primary source of knowledge, while Anki is used for spaced repetition.

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

When contributing:

1. Create a feature branch.
2. Keep changes focused.
3. Add tests where appropriate.
4. Run the test suite.
5. Run the production build.
6. Open a pull request.

Example:

```bash
git switch -c feat/duplicate-detection
```

Before creating a pull request:

```bash
npm test
npm run build
```

## License

See the `LICENSE` file for license information.
