# Anki Exporter

Anki Exporter is an Obsidian plugin for synchronizing Markdown flashcards with Anki through AnkiConnect.

Write flashcards directly inside your Obsidian notes:

```text
What is an array? :: A contiguous collection of elements.
```

Then analyze and synchronize them with an Anki deck without maintaining the same content manually in both applications.

## Features

- Export Markdown flashcards directly to Anki
- Simple `Question :: Answer` syntax
- Search and select existing Anki decks
- Create new Anki decks directly from Obsidian
- Smart synchronization of existing flashcards
- Update changed Anki cards instead of creating duplicates
- Detect unchanged flashcards
- Recreate flashcards whose Anki note was deleted
- Configurable duplicate handling
- Preview changes before synchronization
- Before/after comparison for updated flashcards
- Configurable AnkiConnect URL

## Flashcard Syntax

Flashcards use the following format:

```text
Question :: Answer
```

There must be exactly one space before and after `::`.

Example:

```markdown
# Data Structures

Array :: A contiguous collection of elements.

Stack :: A LIFO data structure.

Queue :: A FIFO data structure.
```

Normal Markdown content is ignored.

## Smart Sync

When a new flashcard is created in Anki, its Anki note ID is stored inside the Markdown document:

```markdown
<!-- anki-note-id:123456789 -->
What is an array? :: A contiguous collection of elements.
```

During future synchronizations, the plugin uses this ID to determine whether the flashcard should be:

- created
- updated
- skipped
- left unchanged
- recreated if the corresponding Anki note no longer exists

This allows the Obsidian note to remain the primary source of the flashcard content.

## Sync Preview

Before synchronizing, Anki Exporter can analyze all flashcards in the current note.

The preview groups flashcards into:

- **Created** – new cards that will be added to Anki
- **Updated** – existing cards whose content changed
- **Skipped** – cards that will not be added, for example because of duplicate handling
- **Unchanged** – cards that are already synchronized

Updated flashcards include a before/after comparison so changes can be reviewed before they are applied.

## Requirements

The following applications are required:

- Obsidian
- Anki Desktop
- AnkiConnect

Anki must be running while synchronizing flashcards.

By default, AnkiConnect is expected at:

```text
http://127.0.0.1:8765
```

The URL can be changed in the plugin settings.

## Installing AnkiConnect

1. Open Anki.
2. Go to **Tools → Add-ons**.
3. Select **Get Add-ons**.
4. Enter the AnkiConnect add-on code:

```text
2055492159
```

5. Restart Anki.

## Usage

1. Open Anki.
2. Open a Markdown note in Obsidian.
3. Add flashcards using the `Question :: Answer` syntax.
4. Open Anki Exporter using the ribbon icon or Command Palette.
5. Select an Anki deck.
6. Configure duplicate handling if necessary.
7. Optionally analyze the flashcards before synchronizing.
8. Export the flashcards to Anki.

## Architecture

The project separates parsing, synchronization, Anki communication and UI logic.

```text
Obsidian Markdown
        │
        ▼
Flashcard Parser
        │
        ▼
Sync / Analysis
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

Project structure:

```text
src/
├── anki/         # AnkiConnect integration
├── flashcards/   # Parsing and Markdown handling
├── sync/         # Synchronization and change analysis
├── ui/           # Obsidian user interface
├── main.ts       # Plugin orchestration
└── settings.ts   # Plugin settings
```

## Development

Install dependencies:

```bash
npm install
```

Start the development build:

```bash
npm run dev
```

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run ESLint:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

## Testing and CI

The project contains unit and integration tests covering areas such as:

- Markdown parsing
- AnkiConnect requests
- Smart synchronization
- Duplicate handling
- Missing Anki notes
- Flashcard analysis
- Export modal behavior
- Error handling
- Plugin orchestration

GitHub Actions automatically runs:

```text
Lint
  ↓
Automated Tests
  ↓
Coverage
  ↓
Production Build
```

Coverage reports are uploaded to Codecov.

## Technology

- TypeScript
- Obsidian Plugin API
- AnkiConnect
- Vitest
- jsdom
- esbuild
- ESLint
- Docker
- GitHub Actions
- Codecov

## Contributing

Contributions, bug reports and feature suggestions are welcome.

Before opening a pull request, run:

```bash
npm run lint
npm test
npm run build
```

## License

MIT
