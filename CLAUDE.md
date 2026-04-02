# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build
npm run build              # Compile TS + build browser bundles + copy src → docs/demo
npm run build:full         # Same as build but includes proprietary vendor files
npm run build:ts           # Compile TypeScript only (src/ts/*.ts → src/ts/*.js)
npm run build:browser      # Build IIFE browser bundles via esbuild (run after build:ts)
npm run build:codegen      # build:ts + build:browser (prerequisite for build/dev)

# Dev
npm run dev                # build:codegen then serve src/ at http://localhost:3000
npm run serve              # Serve docs/demo (built output)

# Tests
npm run test:unit          # Run Node.js unit tests (node:test runner)
npm run test               # Run Cypress e2e tests (headless)
npm run test:open          # Open Cypress interactive runner

# Code generation
npm run generate           # CLI: generate Cypress spec from a form file
npm run setup:vendor       # Copy @better/form-renderer from node_modules into src/vendor/
```

Run a single unit test file:
```bash
node --test src/ts/cy-emulator.test.js
```

## Agent guidelines

See `AGENTS.md` for full agent guidance. Key points:
- Never edit files under `docs/demo/` — that directory is owned by the build script.
- Never run `git push` without explicit user instruction.
- `src/vendor/` and `docs-cache/` are git-ignored; do not commit them.
- For PRDs and task lists follow the process described in `AGENTS.md` (snarktank templates). Put them in `/tasks`.
- Use Deepwiki MCP for openEHR or open-source library questions; Pencil.dev MCP for `.pen` UI mockup files.
- Narrative text in docs/PRDs: short, technical, no filler.

## Architecture

### Overview
Kintegrate is a browser-based editor for **Handlebars transformation scripts** that map between data formats (e.g. openEHR). It also loads openEHR form definitions (`.json`/`.opt` packages), visualizes them using `@better/form-renderer`, and generates Cypress test specs from the form's built-in validation/logic rules. An in-browser test runner (Mocha + Chai + a `cy` emulator) lets specs run without a full Cypress setup.

### Key pages in `src/`
- **`index.html`** — main entry point; integration/transformation editor built on CodeMirror and Tabulator
- **`form-viewer.html`** — loads and renders a form via `@better/form-renderer`; exposes `window.formTestApi` for programmatic field interaction
- **`cypress-form-tester.html`** — hosts the Mocha/Chai in-browser runner; editors for spec code; opens `form-viewer.html` as a popup and drives it via `window.opener.formTestApi`

### Test generation pipeline
```
form JSON/OPT  →  test-generator/parser.js (parseFormDefinition)
               →  test-generator/generator.js (buildDependencySpec)
               →  Cypress spec (.cy.js) or in-browser Mocha spec
```
Both `parser.js` and `generator.js` delegate to `src/test-generation-core.js`, which is a UMD wrapper that `require()`s compiled TypeScript modules from `src/ts/`.

### TypeScript modules in `src/ts/`
All files compile to CommonJS `.js` alongside their `.ts` source (same directory). Compiled `.js` and `.d.ts` files are **not committed** (listed in `.gitignore`); run `npm run build:ts` to regenerate them.

| Module | Purpose |
|---|---|
| `types.ts` | Shared interfaces: `CategoryKey`, `FieldEntry`, `RuleEntry`, `ParsedForm`, etc. |
| `test-title-utils.ts` | String helpers: `sanitizeTestTitle`, `quoteSingle`, `normalizeCategoryKey`, etc. |
| `field-index.ts` | Walks form tree to build `tag → path[]` map; resolves rule paths |
| `rule-extraction.ts` | Extracts visibility/validation/range rules from form condition payloads |
| `code-generation.ts` | Assembles `describe`/`it` spec strings from parsed rules |
| `form-test-api-types.ts` | TypeScript interface for `window.formTestApi` |
| `cy-emulator.ts` | `createCyEmulator()` factory — a Cypress-compatible `cy` object backed by `formTestApi`; unsupported commands set a skip reason rather than throwing |

### Browser bundles (`scripts/build-browser.js` via esbuild)
- `src/test-generation-core.browser.js` — IIFE bundle of the UMD module, global `TestGenerationCore`
- `src/ts/cy-emulator.browser.js` — IIFE bundle of the emulator, global `CyEmulatorBundle`

`cypress-form-tester.html` loads `cy-emulator.browser.js` (not the raw CommonJS file).

### Build output
`npm run build` copies `src/` → `docs/demo/`, skipping `src/vendor/` proprietary files (open-source vendor subdirs like `codemirror` and `tabulator` are included). `docs/` is the GitHub Pages root.

### Vendor files
`src/vendor/` is git-ignored. Run `npm run setup:vendor` to populate it from `node_modules/@better/form-renderer`. `npm run build:full` includes it in the output.

### Cypress configuration
- Base URL: `http://localhost:3000` (override with `CYPRESS_BASE_URL`)
- Spec pattern: `cypress/e2e/**/*.cy.js`
- Generated specs live in `cypress/e2e/generated/`; custom specs in `cypress/e2e/custom/`
- Custom Cypress commands (e.g. `assertRangeSamples`) are in `cypress/support/commands.js`; equivalent logic is ported to `src/ts/cy-emulator.ts`

### In-progress work
See `tasks/tasks-dual-mocha-chai-and-cypress.md` — tasks 6.4 and 8.x are incomplete (manual browser verification of the postMessage removal and end-to-end Mocha runner).
