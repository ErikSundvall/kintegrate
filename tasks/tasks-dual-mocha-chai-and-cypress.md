# Task List: Dual Mocha/Chai In-Browser Emulator + Cypress Testing

**Based on:** [prd-dual-mocha-chai-and-cypress.md](prd-dual-mocha-chai-and-cypress.md)

---

## Relevant Files

- `src/cypress-form-tester.html` - Main host for Mocha/Chai runner; reporter mount point; "Run active tests" trigger; reporter-format buttons.
- `src/form-viewer.html` - Remove postMessage action-playback path (TEST_ACTIONS mechanism).
- `src/test-generation-core.js` - Update generator to emit proper BDD conventions: `beforeEach`/`cy.resetForm()`, `cy.formViewerReady()`, sentence-style titles, no direct `renderer.scriptApi` calls.
- `cypress/support/commands.js` - Semantic reference for `assertRangeSamples` logic to port into the browser helper.
- `UI-design-refactoring-using-pencil.pen` - UI mockup; update to reflect reporter-format buttons before implementing UI changes.
- `cypress.config.js` - Review for any adjustments needed after spec-format changes.

### Notes

- No automated unit tests exist for this codebase. Validate manually by opening the tool in a browser, loading a form, and running the emulator.
- Run `npm run dev` for local development; `npm run build` to verify the GitHub Pages build.
- The `src/vendor/` folder contains proprietary files not in Git; `npm run setup:vendor` is required for a full local build.

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`. Update after each sub-task, not only after an entire parent task.

---

## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Create and checkout a new branch: `git checkout -b feature/dual-mocha-chai-and-cypress`

- [ ] 1.0 Load Mocha/Chai CDN dependencies and expose BDD globals
  - [ ] 1.1 Add pinned Mocha 10.x browser CSS `<link>` and JS `<script>` tags (from `cdnjs`) to `cypress-form-tester.html`, consistent with how CodeMirror and Tabulator are already loaded (FR-1).
  - [ ] 1.2 Add pinned Chai 4.x browser JS `<script>` tag from `cdnjs` to `cypress-form-tester.html` (FR-1).
  - [ ] 1.3 Call `mocha.setup('bdd')` at startup to expose standard BDD globals (`describe`, `context`, `it`, `before`, `beforeEach`, `after`, `afterEach`) so existing spec files execute without modification (FR-2).
  - [ ] 1.4 Confirm that `it.skip` / `describe.skip` are handled natively by Mocha (counted as pending, not run) and that `it.only` / `describe.only` behave as standard Mocha (FR-3, FR-4).

- [ ] 2.0 Implement the `cy` emulator object and command translation layer
  - [ ] 2.1 Implement a `getFormTestApi()` helper that reads `window.opener.formTestApi`; throw `"Form viewer not open or formTestApi not available"` if unavailable (FR-11).
  - [ ] 2.2 Implement a Promise-based command queue on the `cy` object so commands are enqueued and executed sequentially; return `cy` from each enqueue call to enable chaining (FR-5, FR-6, FR-7).
  - [ ] 2.3 Implement `cy.fillField(path, val, opts?)` → `formTestApi.setFieldValue(path, val, opts.multiIndex, opts.searchWithinContainerTag, opts.containerMultiIndex)` (FR-8).
  - [ ] 2.4 Implement `cy.expectVisible(path, opts?)` → `formTestApi.isHidden(path, …)` with Chai assertion `expect(hidden).to.equal(false)` (FR-8).
  - [ ] 2.5 Implement `cy.expectHidden(path, opts?)` → `formTestApi.isHidden(path, …)` with Chai assertion `expect(hidden).to.equal(true)` (FR-8).
  - [ ] 2.6 Implement `cy.expectValue(path, expected, opts?)` → `formTestApi.getFieldValue(path, …)` with Chai assertion `expect(actual).to.deep.equal(expected)` (FR-8).
  - [ ] 2.7 Implement `cy.assertRangeSamples(opts)` as a browser-executable helper that iterates `validSamples` and `invalidSamples`, sets each via `setFieldValue`, re-reads the value, and asserts numeric magnitude and unit via Chai—matching the semantics in `cypress/support/commands.js` (FR-9).
  - [ ] 2.8 Implement `cy.resetForm()` → `formTestApi.resetForm()` (FR-8).
  - [ ] 2.9 Implement `cy.formViewerReady()` that polls `formTestApi.isReady()` with a configurable timeout (default 10 s) (FR-8, FR-12).
  - [ ] 2.10 Implement `cy.waitForFormTestApi()` that waits for `window.opener.formTestApi` to become available (FR-8).
  - [ ] 2.11 Implement a fallback handler for any command not in the translation table (e.g. `cy.intercept`, `cy.visit`): enqueue a skip via `this.skip()` inside Mocha context with reason `"unsupported in emulator: <commandName>"` (FR-10).
  - [ ] 2.12 Patch Mocha's `it()` in the spec evaluation wrapper to automatically await the `cy` command queue after the test body runs, so spec authors need not add `return` or `await` (Section 7.3 decision 3).

- [ ] 3.0 Replace homegrown reporter with Mocha reporters and update UI
  - [ ] 3.1 Update `UI-design-refactoring-using-pencil.pen` to add reporter-format button group (spec / dot / min / json / html) to the runner section; get user feedback on design before implementing UI changes.
  - [ ] 3.2 Wire the existing "Run active tests" button to trigger the Mocha emulator run (evaluate spec text via `new Function(specText)()`, then call `mocha.run()`) instead of the current flat-action extractor (FR-13).
  - [ ] 3.3 Add reporter-format buttons (spec, dot, min, json, html) to the runner section, using the confirmed design from 3.1 (FR-14).
  - [ ] 3.4 Implement a JS variable to persist the selected reporter format across runs within the same session (FR-15).
  - [ ] 3.5 Reuse the existing `#last-run` panel element as the Mocha reporter mount point; clear and re-render on each run (FR-16).
  - [ ] 3.6 Remove homegrown HTML result-building code (`buildRunHtml`, `run-groups`, `result-item`, and related logic) from `cypress-form-tester.html` (FR-16).

- [ ] 4.0 Remove postMessage action-playback path
  - [ ] 4.1 Remove all `TEST_ACTIONS` / `TEST_ACTIONS_ACK` / `TEST_ACTIONS_RESULT` message handling code from `cypress-form-tester.html` (Section 7.5).
  - [ ] 4.2 Remove all `TEST_ACTIONS` / `TEST_ACTIONS_ACK` / `TEST_ACTIONS_RESULT` message handling code from `form-viewer.html` (Section 7.5).

- [ ] 5.0 Update test generator to emit proper BDD conventions
  - [ ] 5.1 Replace inline `renderer.scriptApi.resetForm()` calls in generated specs with `beforeEach(() => { cy.resetForm(); })` at the top level of each `describe` block (FR-19).
  - [ ] 5.2 Remove all direct `renderer.scriptApi` calls from generated `it` blocks; route all ScriptApi access through `cy.*` commands so the same spec runs in both the emulator and Cypress (FR-20).
  - [ ] 5.3 Update generated `it` block titles to use readable, sentence-style descriptions (e.g. `"shows gestational-age when pregnant is true"`) rather than abbreviated codes (FR-21).
  - [ ] 5.4 Emit `cy.formViewerReady()` as the first call inside each top-level `describe` block (once per suite, not per test) (FR-22).

- [ ] 6.0 Verify Cypress compatibility and validate end-to-end
  - [ ] 6.1 Open `cypress-form-tester.html` locally, load a form with a viewer, run tests via the emulator; confirm pass/fail/skip counts are accurate.
  - [ ] 6.2 Verify that each in-browser skip surfaces a human-readable reason string.
  - [ ] 6.3 Export a generated spec via "Export .cy.js" and confirm the raw spec text is unchanged (FR-17, FR-18).
  - [ ] 6.4 Run the exported spec in Cypress (`npm run cypress:run` or `npx cypress open`) and confirm it executes without modification.
  - [ ] 6.5 Confirm ≥ 90 % of generated logic/calc/validation/range spec cases produce a definitive pass, fail, or explicit skip (Success Metrics §8).
