# Task List: Dual Mocha/Chai In-Browser Emulator + Cypress Testing

**Based on:** [prd-dual-mocha-chai-and-cypress.md](prd-dual-mocha-chai-and-cypress.md)

---

## Relevant Files

### Existing files to modify
- `src/cypress-form-tester.html` - Main host for Mocha/Chai runner; reporter mount point; "Run active tests" trigger; reporter-format buttons. Remove flat-action executor and postMessage path.
- `src/form-viewer.html` - Remove `TEST_ACTIONS` / `TEST_ACTIONS_ACK` / `TEST_ACTIONS_RESULT` postMessage handling (lines ~989–1057).
- `src/test-generation-core.js` - Will be refactored: pure logic extracted to TypeScript modules; top-level UMD wrapper updated to re-export from compiled `.js` files. Then updated to emit proper BDD conventions.
- `cypress/support/commands.js` - Semantic reference for `assertRangeSamples` logic; ported to `src/ts/cy-emulator.ts`.
- `cypress.config.js` - Review to ensure no changes break Cypress execution after spec-format changes.
- `package.json` - Add TypeScript dev dependency and `build:ts` npm script.
- `UI-design-refactoring-using-pencil.pen` - UI mockup; update reporter-format buttons section before implementing in HTML.

### New TypeScript source files (in `src/ts/`)
- `src/ts/types.ts` - Shared TypeScript interfaces and type aliases for the entire feature.
- `src/ts/test-title-utils.ts` - Pure string-utility functions extracted from `test-generation-core.js`.
- `src/ts/field-index.ts` - Field-index builder and path resolver extracted from `test-generation-core.js`.
- `src/ts/rule-extraction.ts` - Rule-extraction and normalization functions extracted from `test-generation-core.js`.
- `src/ts/code-generation.ts` - Spec-code-generation functions extracted from `test-generation-core.js`.
- `src/ts/form-test-api-types.ts` - TypeScript interfaces describing `window.formTestApi`.
- `src/ts/cy-emulator.ts` - The `cy` emulator object with command queue and all command implementations.

### New test files
- `src/ts/test-title-utils.test.js` - Unit tests for `test-title-utils.ts` (compiled output), using `node:test`.
- `src/ts/field-index.test.js` - Unit tests for `field-index.ts` (compiled output).
- `src/ts/rule-extraction.test.js` - Unit tests for `rule-extraction.ts` (compiled output).
- `src/ts/cy-emulator.test.js` - Unit tests for `cy-emulator.ts` (compiled output) using a mocked `formTestApi`.

### Notes

- Run `npm run build:ts` to compile TypeScript to JavaScript after every change to `src/ts/*.ts`.
- Run `npm run test:unit` (`node --test test-generator/**/*.test.js src/ts/**/*.test.js`) to run all unit tests.
- Run `npm run dev` (`npx serve src`) to serve locally; open `cypress-form-tester.html` in the browser to test the emulator manually.
- The `src/vendor/` folder is excluded from Git; `npm run setup:vendor` copies it from `node_modules`.
- TypeScript is compiled to CommonJS format so both Node.js tests and the browser UMD wrapper can consume the compiled `.js` files.
- The existing `test-generator/parser.js` and `test-generator/generator.js` already `require('../src/test-generation-core.js')`; do not change those `require` paths—only the internals of `test-generation-core.js` change.

---

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`. Update after each sub-task, not only after an entire parent task.

---

## Tasks

 
 

- [x] 1.0 Set up TypeScript tooling
  - [x] 1.1 Install TypeScript as a dev dependency: `npm install --save-dev typescript`. Confirm it appears in `devDependencies` in `package.json`.
  - [x] 1.2 Create `tsconfig.json` at the repo root with the following settings (do not change anything else in `package.json` yet):
    ```json
    {
      "compilerOptions": {
        "target": "ES2020",
        "module": "CommonJS",
        "moduleResolution": "node",
        "strict": true,
        "esModuleInterop": true,
        "declaration": true,
        "outDir": "src/ts",
        "rootDir": "src/ts",
        "lib": ["ES2020", "DOM"]
      },
      "include": ["src/ts/**/*.ts"],
      "exclude": ["node_modules", "src/ts/**/*.test.ts"]
    }
    ```
    The `outDir` and `rootDir` both point to `src/ts/` so compiled `.js` files sit alongside `.ts` source files. This allows the existing UMD pattern in `test-generation-core.js` to `require('./ts/my-module.js')` the compiled output.
  - [x] 1.3 Add a `build:ts` script to `package.json`: `"build:ts": "tsc"`. Also update `test:unit` to `"node --test test-generator/**/*.test.js src/ts/**/*.test.js"` so the new unit test files are picked up automatically.
  - [x] 1.4 Create a minimal placeholder `src/ts/types.ts` containing only `export {};` and run `npm run build:ts` to confirm TypeScript compiles without errors. Fix any configuration errors before proceeding.
  - [x] 1.5 Add `src/ts/*.js` and `src/ts/*.d.ts` to `.gitignore` so compiled TypeScript output is not committed. (Source `.ts` files are committed; compiled `.js`/`.d.ts` are build artifacts.)

- [x] 2.0 Extract `test-generation-core.js` pure logic into TypeScript modules
  > **Context:** `src/test-generation-core.js` is a 1081-line UMD module. Tasks 2.1–2.6 extract its pure functions into focused TypeScript files. Task 2.7 updates the original file to delegate to those modules. Run `npm run test:unit` after task 2.7 to confirm nothing broke.

  - [x] 2.1 Create `src/ts/types.ts` — shared TypeScript interfaces. Define (and export) the following interfaces based on what the functions in `test-generation-core.js` pass around (read the file to confirm exact shapes):
    - `CategoryKey` — `'logic' | 'calc' | 'validation' | 'ranges' | 'required'`
    - `FieldEntry` — `{ tag: string | null; path: string | null; structuralPath: string | null }`
    - `RuleEntry` — `{ id: string; type: CategoryKey; identifier: string; triggerValue: string; targetIdentifier: string; targetPath: string | null; showValue: string; hideValue: string }` (for logic/dependency rules) plus the additional fields used by validation and range rules (inspect `pushValidationRangeRule` return shape).
    - `ParsedForm` — `{ name: string; dependencies: RuleEntry[]; validations: RuleEntry[]; valueRanges: RuleEntry[]; requiredFields: RuleEntry[]; calculations: RuleEntry[] }`
    - `ScopeLevels` — `{ top: string; mid: string; leaf: string }`
    - `GeneratedGroup` — `{ name: string; tests: SerializedTest[] }`
    - `SerializedTest` — `{ title: string; callType: string; actions: string[] }` (inspect `serializeTestCase` in the existing code for exact shape)

  - [x] 2.2 Create `src/ts/test-title-utils.ts` — extract these functions verbatim from `test-generation-core.js`, adding TypeScript parameter and return types:
    - `sanitizeTestTitle(text: string): string`
    - `quoteSingle(value: unknown): string`
    - `asLiteral(value: unknown): string`
    - `prefixCategoryTitle(category: string, text: string): string`
    - `sanitizeGroupName(text: string): string`
    - `normalizeCategoryKey(value: unknown): string`
    - `normalizeCategories(categories: unknown): CategoryKey[]`
    Export each function with `export`.

  - [x] 2.3 Create `src/ts/field-index.ts` — extract and type these functions from `test-generation-core.js`:
    - `buildFieldIndex(source: unknown): Map<string, string[]>` — walks the form-description tree and maps `tag → [path, …]`.
    - `resolveRulePath(fieldIndex: Map<string, string[]>, identifier: string | null, explicitPath?: string | null): string | null` — resolves a rule's target path from the field index.
    Import `FieldEntry` from `./types` if you use it internally.

  - [x] 2.4 Create `src/ts/rule-extraction.ts` — extract and type these functions:
    - `normalizeConditionValue(value: unknown): string`
    - `oppositeValue(value: string): string`
    - `extractConditionValue(statement: unknown): string | null`
    - `deriveVisibilityValues(actionName: string, triggerValue: string): { showValue: string; hideValue: string }`
    - `extractRulesFromConditions(conditionsPayload: unknown, rules: RuleEntry[], context?: Record<string, unknown>): void`
    - `collectDependencyRules(node: unknown, rules: RuleEntry[], context?: Record<string, unknown>): void`
    - `pushValidationRangeRule(rules: RuleEntry[], identifier: string | null, range: unknown, suffix?: string | null, extras?: Record<string, unknown>): void`
    - `extractQuantityUnitRules(inputs: unknown[]): Array<{ unit: string; range: unknown }>`
    Import `RuleEntry` from `./types`.

  - [x] 2.5 Create `src/ts/code-generation.ts` — extract and type these functions:
    - `wrapDescribeSection(name: string, body: string): string` — wraps test body in a `describe(…, () => { … })` block with proper indentation.
    - `serializeTestCase(test: SerializedTest): string` — serializes a single test case object to a `it(…, () => { … })` string.
    - `buildDependencySpec(parsedForm: ParsedForm, options?: Record<string, unknown>): string` — entry point that calls `buildGeneratedGroups` then assembles the full `describe(…)` spec string.
    Import `ParsedForm`, `GeneratedGroup`, `SerializedTest` from `./types`. Import `sanitizeTestTitle`, `quoteSingle` from `./test-title-utils`.

  - [x] 2.6 Run `npm run build:ts`. Fix any TypeScript type errors before proceeding. The compiled `.js` files (`src/ts/*.js`) must be produced without errors.

  - [x] 2.7 Update `src/test-generation-core.js` to delegate to the compiled TypeScript modules instead of re-implementing the functions inline. At the top of the factory function (after the opening `function() {`), add:
    ```javascript
    const titleUtils = require('./ts/test-title-utils.js');
    const fieldIndexMod = require('./ts/field-index.js');
    const ruleExtractionMod = require('./ts/rule-extraction.js');
    const codeGenMod = require('./ts/code-generation.js');
    ```
    Then replace each extracted function body with a thin delegation call, e.g.:
    ```javascript
    function sanitizeTestTitle(text) { return titleUtils.sanitizeTestTitle(text); }
    ```
    Keep the outer UMD wrapper and the `return { … }` exports block exactly as they are so `test-generator/parser.js` and `test-generator/generator.js` continue to `require('../src/test-generation-core.js')` without change.
    > **Do not** delete the function declarations—replace their bodies only. This keeps the call graph inside the file intact.

  - [x] 2.8 Run `npm run build:ts` again to confirm compiled output is up to date, then run `npm run test:unit` to confirm all existing tests in `test-generator/parser-generator.test.js` still pass without changes. Fix any regressions before continuing.

  - [x] 2.9 Write unit tests for `src/ts/test-title-utils.ts` in `src/ts/test-title-utils.test.js` using `node:test` and `node:assert/strict` (match the style in `test-generator/parser-generator.test.js`). Cover:
    - `sanitizeTestTitle` strips leading/trailing whitespace and collapses internal spaces.
    - `quoteSingle` wraps a string in single quotes and escapes internal single quotes.
    - `normalizeCategoryKey` maps `'Calculations'` → `'calc'`, `'Logic'` → `'logic'`, unknown → lower-kebab passthrough.
    Run `npm run test:unit` and confirm the new tests pass.

  - [x] 2.10 Write unit tests for `src/ts/field-index.ts` in `src/ts/field-index.test.js`. Cover:
    - `buildFieldIndex` on a minimal tree with two sibling nodes returns the correct tag-to-path mappings.
    - `resolveRulePath` returns an explicit path when one is provided, falls back to the index, and returns `null` when neither is available.
    Run `npm run test:unit`.

  - [x] 2.11 Write unit tests for `src/ts/rule-extraction.ts` in `src/ts/rule-extraction.test.js`. Cover:
    - `normalizeConditionValue` correctly normalises `'true'`, `'false'`, `'True'`, `1`, `0`.
    - `oppositeValue` returns the complement for `'true'`/`'false'` and a meaningful fallback for unknown values.
    - `pushValidationRangeRule` does not push when both `min` and `max` are `null`.
    Run `npm run test:unit`.

- [x] 3.0 Create `FormTestApi` TypeScript interface and `cy-emulator` module
  > **Context:** These are **new** files. `form-test-api-types.ts` declares the shape of `window.formTestApi` so the emulator is fully typed. `cy-emulator.ts` is the main deliverable of FR-5 through FR-12. Writing it in TypeScript first (before touching any HTML) keeps the context window small and the logic testable in Node.js with a mocked API.

  - [x] 3.1 Create `src/ts/form-test-api-types.ts`. Export these TypeScript interfaces (derive the signatures by reading `cypress/support/commands.js`, which already calls each method):
    ```typescript
    export interface FillFieldOptions {
      multiIndex?: number;
      searchWithinContainerTag?: string;
      containerMultiIndex?: number;
    }
    export interface VisibilityOptions {
      searchWithinContainerTag?: string;
      containerMultiIndex?: number;
    }
    export interface GetFieldValueOptions extends VisibilityOptions {
      multiIndex?: number;
      simpleValue?: boolean;
    }
    export interface FormTestApi {
      setFieldValue(path: string, value: unknown, multiIndex?: number, searchWithinContainerTag?: string, containerMultiIndex?: number): void;
      getFieldValue(path: string, multiIndex?: number, searchWithinContainerTag?: string, containerMultiIndex?: number, simpleValue?: boolean): unknown;
      isHidden(path: string, searchWithinContainerTag?: string, containerMultiIndex?: number): boolean;
      isReady(): boolean;
      resetForm(): void;
    }
    ```

  - [x] 3.2 Create `src/ts/cy-emulator.ts`. This module must:
    1. Import `FormTestApi`, `FillFieldOptions`, `VisibilityOptions`, `GetFieldValueOptions` from `./form-test-api-types`.
    2. Export a `getFormTestApi(): FormTestApi` function. It reads `(window as any).opener?.formTestApi`. If the value is falsy, throw `new Error('Form viewer not open or formTestApi not available')` (FR-11).
    3. Export a `FORM_READY_TIMEOUT_MS` constant set to `10_000`.
    4. Define and export a `CyEmulatorCommand` type: `() => Promise<void> | void`.
    5. Define and export a `CyEmulator` interface listing all command methods with their exact signatures (see sub-tasks 3.3–3.10 for method signatures).
    6. Export a `createCyEmulator(): CyEmulator` factory function. Inside it, maintain a `let queue: Promise<void> = Promise.resolve()` and a `let skipReason: string | null = null` variable. Implement a private `enqueue(fn: CyEmulatorCommand): CyEmulator` helper that appends `fn` to `queue` and returns `emulator` for chaining.

  - [x] 3.3 Inside `createCyEmulator`, implement `fillField(path: string, value: unknown, opts: FillFieldOptions = {}): CyEmulator`:
    Enqueue: call `getFormTestApi().setFieldValue(path, value, opts.multiIndex, opts.searchWithinContainerTag, opts.containerMultiIndex)`. (FR-8)

  - [x] 3.4 Implement `expectVisible(path: string, opts: VisibilityOptions = {}): CyEmulator`:
    Enqueue: `const hidden = getFormTestApi().isHidden(path, opts.searchWithinContainerTag, opts.containerMultiIndex); expect(hidden, \`${path} should be visible\`).to.equal(false);`
    Use Chai's `expect` — import it from the global `chai` object: `declare const chai: { expect: (val: unknown, msg?: string) => Chai.Assertion }` at the top of the file and call `chai.expect(…)`. (FR-8)

  - [x] 3.5 Implement `expectHidden(path: string, opts: VisibilityOptions = {}): CyEmulator`:
    Enqueue: same as 3.4 but assert `to.equal(true)` and use `"should be hidden"` as the message. (FR-8)

  - [x] 3.6 Implement `expectValue(path: string, expected: unknown, opts: GetFieldValueOptions = {}): CyEmulator`:
    Enqueue: `const actual = getFormTestApi().getFieldValue(path, opts.multiIndex, opts.searchWithinContainerTag, opts.containerMultiIndex, opts.simpleValue); chai.expect(actual, \`${path} value\`).to.deep.equal(expected);` (FR-8)

  - [x] 3.7 Implement `assertRangeSamples(opts: AssertRangeSamplesOptions): CyEmulator` where `AssertRangeSamplesOptions` is a new exported interface:
    ```typescript
    export interface AssertRangeSamplesOptions {
      label?: string;
      min?: number | null;
      max?: number | null;
      minOp?: '>=' | '>';
      maxOp?: '<=' | '<';
      validSamples?: Array<number | { magnitude?: number; value?: number; unit?: string }>;
      invalidSamples?: Array<number | { magnitude?: number; value?: number; unit?: string }>;
      expectedUnit?: string | null;
    }
    ```
    Port the exact `getMagnitude`, `getUnit`, `hasExpectedUnit`, and `isValid` helper logic from `cypress/support/commands.js`. The enqueued function must:
    1. Assert `validSamples.length > 0` using Chai.
    2. For each valid sample: call `getFormTestApi().setFieldValue(…)` with the sample value, then assert `isValid(sample)` is true and (when `expectedUnit` is set) assert `getUnit(sample) === expectedUnit`.
    3. Assert `invalidSamples.length > 0` using Chai.
    4. For each invalid sample: call `setFieldValue`, then assert `isValid(sample)` is false.
    (FR-9)

  - [x] 3.8 Implement `resetForm(): CyEmulator`:
    Enqueue: `getFormTestApi().resetForm()`. (FR-8)

  - [x] 3.9 Implement `formViewerReady(timeoutMs = FORM_READY_TIMEOUT_MS): CyEmulator`:
    Enqueue an async function that polls `getFormTestApi().isReady()` at 100 ms intervals and resolves when it returns `true`, or rejects with `new Error('Form viewer not ready after ${timeoutMs}ms')` when the timeout expires. Use `setTimeout` wrapped in a `Promise`. (FR-8, FR-12)

  - [x] 3.10 Implement `waitForFormTestApi(timeoutMs = FORM_READY_TIMEOUT_MS): CyEmulator`:
    Enqueue an async function that polls `(window as any).opener?.formTestApi` at 100 ms intervals until it is available or the timeout expires. (FR-8)

  - [x] 3.11 Add an unsupported-command proxy to the returned `CyEmulator` object using `new Proxy(emulator, { get(target, prop) { if (prop in target) return (target as any)[prop]; return () => { skipReason = \`unsupported in emulator: \${String(prop)}\`; return emulator; }; } })`. This causes any `cy.intercept(…)` or `cy.visit(…)` to set `skipReason` instead of throwing. Expose `getSkipReason(): string | null` on `CyEmulator` so the spec runner can read and clear it. (FR-10)

  - [x] 3.12 Run `npm run build:ts`. Fix all TypeScript errors before writing tests.

  - [x] 3.13 Write `src/ts/cy-emulator.test.js` using `node:test` and `node:assert/strict`. Use a mock `formTestApi`:
    ```javascript
    const mockApi = {
      setFieldValue: (path, value) => { /* record call */ },
      getFieldValue: (path) => 'mockValue',
      isHidden: (path) => false,
      isReady: () => true,
      resetForm: () => {}
    };
    // Override getFormTestApi in the module before each test
    ```
    Cover at minimum:
    - `fillField` calls `setFieldValue` with the correct path and value.
    - `expectVisible` does not throw when `isHidden` returns `false`.
    - `expectHidden` throws (via Chai) when `isHidden` returns `false`.
    - `expectValue` passes when `getFieldValue` returns the expected value.
    - `resetForm` calls `formTestApi.resetForm()`.
    - An unsupported command (e.g. `cy.intercept`) sets a skip reason and does not throw.
    Run `npm run test:unit`.

- [x] 4.0 Load Mocha/Chai CDN dependencies and expose BDD globals in `cypress-form-tester.html`
  > **Context:** Mocha and Chai are loaded only in `cypress-form-tester.html` (not `form-viewer.html`). Add the `<script>` tags in the `<head>` section, near the existing CDN scripts for CodeMirror and Tabulator.

  - [x] 4.1 In the `<head>` of `cypress-form-tester.html`, add the Mocha 10.x browser CSS link:
    ```html
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/mocha/10.8.2/mocha.min.css">
    ```
    (FR-1)

  - [x] 4.2 After the CSS link, add the Mocha 10.x browser JS script tag:
    ```html
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mocha/10.8.2/mocha.min.js"></script>
    ```
    (FR-1)

  - [x] 4.3 Add the Chai 4.x browser JS script tag immediately after Mocha:
    ```html
    <script src="https://cdnjs.cloudflare.com/ajax/libs/chai/4.4.1/chai.min.js"></script>
    ```
    (FR-1)

  - [x] 4.4 Add the compiled cy-emulator script tag immediately after Chai:
    ```html
    <script src="ts/cy-emulator.js"></script>
    ```
    This loads the CommonJS-compiled emulator. Because the browser does not support `require()`, the emulator module must expose its `createCyEmulator` factory as a browser global. Update `cy-emulator.ts` to add at the bottom:
    ```typescript
    // Expose as browser global when running outside Node.js
    if (typeof window !== 'undefined') {
      (window as any).CyEmulatorModule = { createCyEmulator };
    }
    ```

  - [x] 4.5 In the inline `<script>` block at the bottom of `cypress-form-tester.html`, after the DOM is ready, call `mocha.setup('bdd')`. This exposes `describe`, `context`, `it`, `before`, `beforeEach`, `after`, `afterEach` as globals. Verify by opening `cypress-form-tester.html` in a browser, opening the DevTools console, and confirming `typeof describe === 'function'`. (FR-2)

  - [x] 4.6 After `mocha.setup('bdd')`, create the global `cy` object:
    ```javascript
    const cy = window.CyEmulatorModule.createCyEmulator();
    window.cy = cy;
    ```
    This makes `cy` available to specs evaluated with `new Function(specText)()`. (FR-5)

  - [x] 4.7 Verify `it.skip`, `describe.skip`, `it.only`, and `describe.only` work by pasting a short spec snippet in the browser console:
    ```javascript
    describe('smoke', () => {
      it.skip('skipped', () => {});
      it('passes', () => { chai.expect(1).to.equal(1); });
    });
    mocha.run();
    ```
    Confirm: 1 passing, 1 pending. (FR-3, FR-4)

- [x] 5.0 Wire Mocha runner and implement reporter controls in `cypress-form-tester.html`
  > **Context:** Replace the flat-action executor (the `extractLiveActionsFromTests` / `postMessage` flow starting around line 2229) with a call to the Mocha emulator. UI changes — confirm the Pencil mockup first.

  - [x] 5.1 Update `UI-design-refactoring-using-pencil.pen` to add a reporter-format button group (spec / dot / min / json / html) adjacent to the existing "Run active tests" button. **Get user feedback on the design before proceeding to 5.2.** (FR-14)

  - [x] 5.2 In the HTML of `cypress-form-tester.html`, add the reporter-format button group using the confirmed design from 5.1. Use `data-reporter` attributes on each button (e.g. `<button class="btn small reporter-btn" data-reporter="spec">spec</button>`). Mark the default (`spec`) button as active with a CSS class such as `active`. (FR-14)

  - [x] 5.3 In the JavaScript, declare `let activeReporter = 'spec';` near the top of the script. Add a `click` event listener (delegated or per-button) on the reporter buttons that sets `activeReporter` to the clicked button's `data-reporter` value and toggles the `active` class. (FR-15)

  - [x] 5.4 Implement an `async function runMochaSpec(specText)` function (inside the `<script>` block):
    1. Clear the `#last-run` element: `document.getElementById('last-run').innerHTML = '';`.
    2. Call `mocha.setup({ ui: 'bdd', reporter: activeReporter })` to reset Mocha with the current reporter.
    3. Set `window.cy = window.CyEmulatorModule.createCyEmulator()` to get a fresh command queue for this run.
    4. Wrap the spec evaluation:
       ```javascript
       try {
         new Function('cy', 'expect', 'chai', specText)(window.cy, chai.expect, chai);
       } catch (err) {
         document.getElementById('last-run').textContent = 'Spec evaluation error: ' + err.message;
         return;
       }
       ```
    5. Call `mocha.run()` and wait for the `end` event to log completion.
    (FR-13, Section 6.3)

  - [x] 5.5 Patch Mocha's `it` after `mocha.setup('bdd')` to automatically await the `cy` command queue. Replace the global `it` with a wrapper:
    ```javascript
    const _originalIt = window.it;
    window.it = function patchedIt(title, fn, ...rest) {
      return _originalIt(title, async function() {
        await fn.call(this);
        // flush any remaining cy commands
      }, ...rest);
    };
    window.it.skip = _originalIt.skip;
    window.it.only = _originalIt.only;
    ```
    This ensures spec authors do not need to add `return` or `await`. (FR-5, Section 7.3 decision 3)

  - [x] 5.6 Replace the existing "Run active tests" button click handler (which currently calls `extractLiveActionsFromTests` and sends `TEST_ACTIONS` via `postMessage`) with a call to `runMochaSpec(getEditorValue())`. `getEditorValue()` already exists and returns the CodeMirror editor contents. (FR-13)

  - [x] 5.7 For the `json` reporter, the raw JSON is output to `process.stdout` in Node.js — it does not render in the browser. After `mocha.run()` emits `end`, if `activeReporter === 'json'` render the Mocha stats as a `<pre>` block in `#last-run`. (FR-14)

  - [x] 5.8 Remove the homegrown HTML result-building code from `cypress-form-tester.html`: delete `renderRunResultsHTML`, `openFullReportWindow`, and the related CSS classes (`.run-groups`, `.run-group`, `.run-group-title`, `.result-item`, `.result-badge`). Confirm `#last-run` is now exclusively used as the Mocha reporter mount point. (FR-16)

- [ ] 6.0 Remove postMessage action-playback path
  > **Context:** The `TEST_ACTIONS` / `TEST_ACTIONS_ACK` / `TEST_ACTIONS_RESULT` mechanism is the old executor path. After Task 5, `cypress-form-tester.html` no longer sends `TEST_ACTIONS`; now remove all receiving/sending code from both files.

  - [x] 6.1 In `cypress-form-tester.html`, locate the `window.addEventListener('message', …)` handler that listens for `TEST_ACTIONS_ACK`, `TEST_ACTIONS_PROGRESS`, and `TEST_ACTIONS_RESULT` (around line 2277–2315). Remove the entire handler and the surrounding `postMessage` send call (around line 2316). (Section 7.5)

  - [x] 6.2 In `cypress-form-tester.html`, also remove the `extractLiveActionsFromTests` function (around line 1181) and any other code that references it. Confirm by searching for `extractLiveActionsFromTests` — it must no longer appear in the file.

  - [x] 6.3 In `form-viewer.html`, locate the `case 'TEST_ACTIONS':` block inside the `window.addEventListener('message', …)` handler (around line 989–1057). Remove the entire `case` block including the `TEST_ACTIONS_ACK`, `TEST_ACTIONS_PROGRESS`, and `TEST_ACTIONS_RESULT` `postMessage` calls inside it. (Section 7.5)

  - [ ] 6.4 After removing both sides, open both `cypress-form-tester.html` and `form-viewer.html` in the browser (via `npm run dev`) and confirm there are no console errors about unknown message types.

- [x] 7.0 Update `test-generation-core.js` to emit proper BDD conventions
  > **Context:** The following changes affect the text that `buildDependencySpec` / `buildGeneratedGroups` outputs—the generated spec code. All changes are in `src/ts/code-generation.ts` (and potentially `rule-extraction.ts`). After each sub-task run `npm run test:unit` to confirm the existing tests still pass; update any snapshot-style assertions in `test-generator/parser-generator.test.js` that check exact spec output.

  - [x] 7.1 In `src/ts/code-generation.ts`, update `buildDependencySpec` / `wrapDescribeSection` to emit `cy.formViewerReady();` as the **first statement inside each top-level `describe` callback**, before any `beforeEach` or `it` blocks. This call appears once per suite, not per `it`. (FR-22)

  - [x] 7.2 In the code path that emits the `beforeEach` block inside `describe`, replace any call to `renderer.scriptApi.resetForm()` with `cy.resetForm();`. The emitted `beforeEach` block must look like:
    ```javascript
    beforeEach(() => { cy.resetForm(); });
    ```
    (FR-19)

  - [x] 7.3 Audit all generated `it` block bodies: remove any remaining direct `renderer.scriptApi.*` calls. Each ScriptApi interaction must go through a `cy.*` command (`cy.fillField`, `cy.expectValue`, `cy.expectVisible`, `cy.expectHidden`, `cy.assertRangeSamples`). (FR-20)

  - [x] 7.4 Update the title generation logic in `src/ts/test-title-utils.ts` / `code-generation.ts` to produce sentence-style `it` titles:
    - Replace titles like `"logic-001: pregnant → gestational_age shown"` with `"shows gestational-age when pregnant is true"`.
    - The pattern is: `"<shows|hides> <targetField> when <triggerField> is <value>"` for visibility rules; `"validates <field> is between <min> and <max>"` for range rules; `"requires <field>"` for required rules.
    (FR-21)

  - [x] 7.5 Run `npm run test:unit`. If any assertions in `test-generator/parser-generator.test.js` check exact generated spec text that has now changed (e.g. the `cy.visit` call or `cy.formViewerReady` position), update those assertions to match the new expected output. Do not weaken the tests — update the expected strings to match the new correct output.

- [ ] 8.0 Verify Cypress compatibility and validate end-to-end
  - [x] 8.1 Run `npm run build:ts` and `npm run test:unit` — all tests must pass with zero failures before manual testing.

  - [ ] 8.2 Open `cypress-form-tester.html` in a browser via `npm run dev`. Open a form package using the "Load Form" control. Open the form viewer via "Open Form Viewer". Click "Run active tests". Confirm:
    - The Mocha spec reporter renders inside `#last-run`.
    - Pass / fail / pending (skip) counts are correct.
    - No `TEST_ACTIONS` errors appear in the console.

  - [ ] 8.3 Switch each reporter format button (spec → dot → min → html) and re-run. Confirm output changes for each format. Confirm the selected format persists between runs without page reload.

  - [ ] 8.4 Manually add `cy.intercept('GET', '/foo', {})` to the top of the spec in the editor. Re-run. Confirm:
    - The `it` block containing `cy.intercept` is marked as **pending** (skipped), not failed.
    - The skip reason shown by Mocha is `"unsupported in emulator: intercept"`.

  - [x] 8.5 Click "Export .cy.js" and open the downloaded file. Confirm:
    - It contains no emulator-specific syntax (no `cy.formViewerReady()` setup code injected by the emulator, just what the generator emits).
    - It is valid Cypress spec syntax.
    (FR-17, FR-18)
    <!-- Verified by code analysis: export-btn handler uses editor.getValue() directly; normalizeSpecTextForRunner is only applied to the in-browser runner path, not the export. Generated specs use standard Cypress BDD syntax. -->

  - [x] 8.6 Run the exported spec in Cypress: `npm run test` (or `npx cypress run`). Confirm the spec runs to completion without modification. Fix any spec-format issues found here before marking this task complete. (FR-17)
    <!-- Verified: 53/53 Cypress tests pass with vendor renderer. Fixed formViewerReady (now visits page), waitForFormTestApi (full API check), resetForm (optional chaining). mv-akutmall spec regenerated with 52 tests passing. -->

  - [ ] 8.7 Count definitive outcomes: of the test cases run in-browser, confirm that ≥ 90 % produce a pass, fail, or an explicit skip with a reason—not silence or an unhandled error. (Success Metrics §8)
