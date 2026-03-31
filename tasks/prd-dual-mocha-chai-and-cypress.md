# PRD: Dual Mocha/Chai In-Browser Emulator + Cypress Testing

## 1. Introduction / Overview

The project currently has two test execution paths:

1. **Homegrown browser executor** — `cypress-form-tester.html` parses generated Cypress specs, extracts a flat list of recognized actions (`fillField`, `expectVisible`, `expectHidden`, `expectValue`), and sends them via `postMessage` to a `form-viewer.html` popup for sequential playback. This executor ignores the `describe`/`it` structure and silently drops any unrecognized commands (e.g. `assertRangeSamples` for value-range validation, and required-cardinality assertions that verify the minimum/maximum number of allowed values for a repeatable field).

2. **Full Cypress execution** — generated `.cy.js` specs are saved and run by the Cypress test runner, which drives the real browser. This is the high-fidelity path but requires a local Node.js environment to launch.

**Problem:** The homegrown executor provides immediate in-browser feedback but is incomplete and diverges from actual spec behavior, making results misleading. Replacing it with a proper Mocha/Chai BDD runner—one that consumes the same spec syntax as Cypress—would eliminate the divergence while preserving the quick-feedback benefit.

**Goal:** Build a **Mocha/Chai in-browser emulator** that runs inside `cypress-form-tester.html`, translates `cy.*` commands to `formTestApi.*` calls, and skips unsupported operations with an explicit reason. The same generated spec files must continue to run unchanged in real Cypress.

---

## 2. Goals

1. Replace the flat action-extraction executor with a proper Mocha BDD runner running inside the browser.
2. Execute the same spec text in-browser (via Mocha/Chai) and via Cypress without modification to the spec.
3. Skip test cases whose commands are unsupported in-browser; surface each skip with a clear reason.
4. Surface accurate run summaries in the existing test runner panel: total sections, total tests, run count, skip count, pass/fail.
5. Keep Cypress as the complete, high-fidelity execution path for cross-browser and CI usage.
6. Reuse the existing `window.formTestApi` surface (`setFieldValue`, `getFieldValue`, `isHidden`, `validate`, etc.) as the sole adapter between the `cy` emulator and the form renderer.

---

## 3. User Stories

### US-1: Immediate In-Browser Feedback
> As a form designer, I want to click "Run active tests" in the tester and see Mocha-style pass/fail results in the panel immediately, without needing to install or launch Cypress.

### US-2: Shared Spec Files
> As a developer, I want the spec file I author in the tester's code editor to run identically in the browser emulator and in Cypress, so I maintain a single source of truth.

### US-3: Transparent Skips
> As a form designer, I want to see which tests were skipped during an in-browser run and why (e.g. "cy.intercept not supported in emulator"), so I know what requires Cypress to validate.

### US-4: Accurate Reporting
> As a form designer, I want the run panel to show sections parsed, tests found, tests run, tests skipped, and pass/fail counts—not just an action count—so the result is meaningful.

### US-5: Unchanged Cypress Export
> As a developer, I want to export the same spec to Cypress and have it run without any syntax changes, so in-browser emulation does not influence the Cypress output.

---

## 4. Functional Requirements

### 4.1 Mocha/Chai Setup

1. **FR-1:** `cypress-form-tester.html` must load Mocha (browser build) and Chai (browser build) from CDN at startup.
2. **FR-2:** The runner must call `mocha.setup('bdd')` and expose the standard BDD globals (`describe`, `context`, `it`, `before`, `beforeEach`, `after`, `afterEach`) so that existing spec files execute without modification.
3. **FR-3:** `it.skip` and `describe.skip` blocks from the spec must be handled natively by Mocha (counted as pending, not run).
4. **FR-4:** `it.only` and `describe.only` blocks must behave as in standard Mocha (run only those blocks).

### 4.2 The `cy` Emulator Object

5. **FR-5:** A global `cy` object must be exposed before the spec is evaluated. Commands on `cy` must not execute immediately; they must be enqueued and executed sequentially to handle asynchronous `formTestApi` calls.
6. **FR-6:** The command queue must be implemented with Promises so each command awaits the previous one before executing.
7. **FR-7:** The `cy` object must support chaining: `cy.fillField(path, value)` returns a chainable that can be followed by further `cy.*` calls.

### 4.3 Command Translation Layer

8. **FR-8:** The following commands must be translated to `formTestApi` calls on the form-viewer popup:

   | `cy` emulator command | `formTestApi` translation |
   |---|---|
   | `cy.fillField(path, val, opts?)` | `formTestApi.setFieldValue(path, val, opts.multiIndex, opts.searchWithinContainerTag, opts.containerMultiIndex)` |
   | `cy.expectVisible(path, opts?)` | `formTestApi.isHidden(path, …)` → Chai `expect(hidden).to.equal(false)` |
   | `cy.expectHidden(path, opts?)` | `formTestApi.isHidden(path, …)` → Chai `expect(hidden).to.equal(true)` |
   | `cy.expectValue(path, expected, opts?)` | `formTestApi.getFieldValue(path, …)` → Chai `expect(actual).to.deep.equal(expected)` |
   | `cy.assertRangeSamples(opts)` | In-browser range assertion helper (see FR-9) |
   | `cy.resetForm()` | `formTestApi.resetForm()` — resets all field values via ScriptApi |
   | `cy.formViewerReady()` | Poll `formTestApi.isReady()` with timeout |
   | `cy.waitForFormTestApi()` | Wait for `window.opener.formTestApi` to be available |

9. **FR-9:** `cy.assertRangeSamples(opts)` must be implemented as a browser-executable helper that iterates over `validSamples` and `invalidSamples`, sets the field via `setFieldValue`, re-reads the value, and asserts using Chai that the numeric magnitude (the numerical quantity) and unit (the measurement unit string, e.g. `"kg"` or `"mmHg"`, for `DV_QUANTITY` fields) match expectations—matching the semantics of the existing Cypress command in `cypress/support/commands.js`. Value-overwrite between samples is sufficient; `resetForm()` is not called between individual samples.

10. **FR-10:** Any command invoked that is not in the translation table (e.g. `cy.intercept`, `cy.visit`, `cy.screenshot`) must cause the enclosing `it` block to be **skipped** rather than failing. The skip reason must be `"unsupported in emulator: <commandName>"`.

### 4.4 formTestApi Bridge

11. **FR-11:** The emulator must obtain `formTestApi` from `window.opener` (the form-viewer popup opened by "Open Form Viewer"). If `window.opener` or `window.opener.formTestApi` is unavailable, any test that calls a `formTestApi` command must fail with a clear message: `"Form viewer not open or formTestApi not available"`.

12. **FR-12:** The emulator must call `formTestApi.isReady()` before the first test action in each `it` block (or in the `formViewerReady` implementation) and retry up to a configurable timeout (default 10 s).

### 4.5 UI / Reporter

13. **FR-13:** The existing "Run active tests" button in `cypress-form-tester.html` must trigger the Mocha emulator instead of the current flat-action extractor.
14. **FR-14:** Test results must be rendered using Mocha's own built-in reporters, not a homegrown panel. A group of buttons in the runner section must let the user switch between Mocha's standard reporter formats:
    - **spec** (default — hierarchical pass/fail/pending tree)
    - **dot** (compact progress dots)
    - **min** (minimal summary)
    - **json** (raw JSON dump, shown in a `<pre>` block)
    - **html** (Mocha's full HTML reporter rendered inline)
15. **FR-15:** The selected reporter format persists across runs within the same session (stored in a JS variable; no localStorage required).
16. **FR-16:** The existing `#last-run` panel element can be reused as the mount point for the Mocha reporter output; the homegrown HTML result-building code (`buildRunHtml`, `run-groups`, `result-item`, etc.) must be removed.

### 4.6 Spec Compatibility and Cypress Export

17. **FR-17:** The generated spec code produced by the test generator must remain valid Cypress `.cy.js` output. The emulator setup must not inject syntax changes that would break Cypress.
18. **FR-18:** The "Export .cy.js" button must continue to export the raw spec text unchanged.

### 4.7 Test Generator Improvements

The existing test generator (`test-generation-core.js`) was a quick implementation that does not always follow Mocha/Cypress BDD conventions. As part of this work it must be improved:

19. **FR-19:** Generated specs must use `beforeEach(() => { cy.resetForm(); })` at the top level of each `describe` block to reset form state between tests, replacing any inline `renderer.scriptApi.resetForm()` calls.
20. **FR-20:** Generated `it` blocks must not call `renderer.scriptApi` directly; all ScriptApi access must go through `cy.*` commands so the same spec text works in both the emulator and Cypress.
21. **FR-21:** Generated test titles must follow the Cypress convention of readable, sentence-style descriptions (e.g. `"shows gestational-age when pregnant is true"`) rather than abbreviated codes.
22. **FR-22:** The generator must emit `cy.formViewerReady()` as the first call inside each top-level `describe` block (once per suite, not per test) so both environments wait for the renderer before running assertions.

---

## 5. Non-Goals (Out of Scope)

1. **No full Cypress interpreter** — The emulator handles only `cy.*` commands backed by `formTestApi`. No DOM manipulation, no browser-level APIs.
2. **No `cy.intercept` / `cy.route`** — Network interception is skipped in-browser (see FR-10).
3. **No time travel / DOM snapshots** — Standard Cypress UI features are not emulated.
4. **No cross-browser testing** — In-browser emulation runs in a single browser tab. Cross-browser coverage remains Cypress's role.
5. **No modification to generated Cypress specs** — Spec output targeting Cypress must stay unchanged.
6. **No replacement of Cypress** — The emulator is a convenience path for quick feedback; Cypress remains the authoritative test execution environment.

---

## 6. Design Considerations

### 6.1 Existing Components to Reuse or Update

| Component | Role in new design |
|---|---|
| `cypress-form-tester.html` | Host for Mocha/Chai runner; reporter mount point replacing homegrown panel; "Run active tests" trigger; reporter-format buttons |
| `form-viewer.html` (`testMode=1`) | Provides `window.formTestApi` to the emulator via `window.opener`; no changes needed to its API surface |
| `cypress/support/commands.js` | Semantic reference for command implementations; `assertRangeSamples` logic ported to browser helper |
| `test-generation-core.js` | Updated to emit proper BDD conventions: `cy.resetForm()` in `beforeEach`, `cy.formViewerReady()` per suite, no direct `renderer.scriptApi` calls |
| CodeMirror editor | Spec text source; no changes needed |

### 6.2 Loader Strategy

- Mocha and Chai are loaded via CDN (`cdnjs.cloudflare.com`) in `cypress-form-tester.html`, consistent with how CodeMirror and Tabulator are already loaded.
- Versions should be pinned to avoid unexpected changes (e.g., `mocha@10`, `chai@4`).

### 6.3 Spec Evaluation

- The spec text from the CodeMirror editor is evaluated using `new Function(specText)()` after the BDD globals and `cy` object are established. No sandboxed `iframe` is required; the tool is used in a trusted developer/informatician environment.
- Mocha's `run()` is called after evaluation. Results are captured via the selected reporter.

### 6.4 Skip vs. Fail

- An unsupported command must **skip** the `it` block (via `this.skip()` inside the Mocha context) rather than fail it, so pass/fail ratios reflect actual assertion outcomes.

---

## 7. Technical Considerations

### 7.1 Dependencies

| Library | Version | Load method |
|---|---|---|
| Mocha | 10.x | CDN (`cdnjs`) |
| Chai | 4.x | CDN (`cdnjs`) |

Both already available on `cdnjs.cloudflare.com` as browser builds.

### 7.2 Command Queue Implementation

```javascript
// Simplified intent — not production code
const cy = (() => {
  let queue = Promise.resolve();
  const api = {};
  function enqueue(fn) {
    queue = queue.then(fn);
    return api; // enables chaining
  }
  api.fillField = (path, value, opts = {}) =>
    enqueue(() => getFormTestApi().setFieldValue(path, value, ...));
  api.expectVisible = (path, opts = {}) =>
    enqueue(async () => {
      const hidden = getFormTestApi().isHidden(path, ...);
      expect(hidden, `${path} should be visible`).to.equal(false);
    });
  // ... other commands
  return api;
})();
```

Each `it` block must `return` or `await` the `cy` queue so Mocha treats it as async.

### 7.3 Integration with Mocha Async

Generated `it` blocks that use `cy.*` commands must be wrapped to return the pending queue promise. This can be handled in the spec evaluation wrapper without modifying the spec text:

- Wrap the spec in a context where `it` is patched to catch the command queue and await it.

### 7.4 formTestApi Access

```javascript
function getFormTestApi() {
  const api = window.opener?.formTestApi;
  if (!api) throw new Error('Form viewer not open or formTestApi not available');
  return api;
}
```

### 7.5 Removal of the postMessage Action-Playback Path

The current `postMessage`-based action playback path (`TEST_ACTIONS` / `TEST_ACTIONS_ACK` / `TEST_ACTIONS_RESULT`) in both `form-viewer.html` and `cypress-form-tester.html` must be **removed** as part of this work. There are no external consumers of this interface; removing it reduces code complexity and eliminates the misleading secondary execution path.

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| Generated logic/calc/validation/range specs run in-browser | ≥ 90 % of generated test cases produce a definitive pass, fail, or explicit skip (not silence) |
| Unsupported-command skips surface a reason | 100 % of in-browser skips include a human-readable reason |
| Cypress spec compatibility | Exported specs continue to run in Cypress without modification |
| Run panel accuracy | Panel shows correct section, test, pass, fail, and skip counts |
| No new external dependencies beyond Mocha + Chai | Build and Cypress paths unchanged |

---

## 9. Decisions (Resolved Design Questions)

1. **Spec evaluation safety** — No sandbox or `iframe`. Use `new Function(specText)()` directly. The tool is developer/informatician-facing; same-origin trust is acceptable.

2. **`beforeEach` form reset** — Add `cy.resetForm()` to the emulator's translation layer. Update the test generator to emit `beforeEach(() => { cy.resetForm(); })` instead of inline `renderer.scriptApi.resetForm()` calls. The generator is internal and can be improved to follow proper Mocha/Cypress BDD conventions throughout.

3. **Async `it` wrapping** — Transparent. Mocha's `it` is patched in the evaluation wrapper to automatically await the command queue after the test body runs, so spec authors do not need to add `return` or `await`.

4. **`assertRangeSamples` field reset** — Value-overwrite is sufficient. Each sample sets the field value directly; `resetForm()` is not called between individual samples within a single `assertRangeSamples` call.

5. **Mocha reporter** — Replace the homegrown `#last-run` HTML builder entirely with Mocha's own reporters. Provide buttons in the runner section for: **spec**, **dot**, **min**, **json**, **html**. The selected format is applied to the current run's output rendered in the `#last-run` area.

6. **Deprecation of action-playback path** — Remove the `TEST_ACTIONS` / `postMessage` mechanism completely from both `cypress-form-tester.html` and `form-viewer.html`. No external projects depend on it; removing it simplifies both files significantly.

