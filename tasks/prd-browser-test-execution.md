# Browser Test Execution PRD

## Problem

- Generated specs contain multiple test kinds across logic, validation, ranges, required, and calculations.
- The browser runner in `src/cypress-form-tester.html` currently extracts only a narrow live-action subset and sends a flat `actions` array to `src/form-viewer.html`.
- This makes later `describe()` sections appear skipped when they contain helper assertions or plain `expect()`-based checks.

## Current State

- `assertRangeSamples` exists today as a Cypress custom command in `cypress/support/commands.js`.
- `hasRequiredCardinality` is not a shared helper. It is emitted inline inside generated required tests from `src/test-generation-core.js`.
- `src/form-viewer.html` does not receive tests or `describe()` sections. It receives only actions.
- The viewer currently reports `actions.length`, not total parsed tests or runnable-test counts.

## Goal

- Distinguish clearly between:
  - full generated tests
  - browser-runnable tests
  - helper-assertion tests
  - unsupported or deferred tests
- Avoid silently dropping tests from browser runs.
- Make browser-run reporting explain what was parsed, what was runnable, and what was skipped.

## Decisions

- Keep Cypress export as the full-fidelity output path.
- Do not execute arbitrary `expect()` code strings in the browser runner.
- Do not build a full Cypress interpreter in the browser.
- Add shared helper semantics for browser-executable assertions.
- First helper targets:
  - `assertRangeSamples`
  - `assertRequiredCardinality`

## Target Design

### 1. Normalized Browser-Run Payload

Replace the current flat-only payload with a richer payload sent from `src/cypress-form-tester.html` to `src/form-viewer.html`.

Minimum shape:

```js
{
  runId,
  suite: {
    sectionCount,
    testCount,
    runnableTestCount,
    unsupportedTestCount
  },
  runnableTests: [
    {
      sectionName,
      testTitle,
      steps: [
        { kind: 'action', action: 'fillField', target, value },
        { kind: 'assertion', helper: 'assertRangeSamples', payload: { ... } }
      ]
    }
  ],
  unsupportedTests: [
    {
      sectionName,
      testTitle,
      reason
    }
  ]
}
```

### 2. Shared Helper Semantics

Move reusable assertion intent into named helpers instead of inline opaque code when browser execution is desired.

Initial helper set:

- `assertRangeSamples(payload)`
- `assertRequiredCardinality(payload)`

Recommended split:

- shared payload shapes and helper semantics: `src/test-generation-core.js`
- browser execution adapters: `src/form-viewer.html`
- Cypress command adapters: `cypress/support/commands.js`

### 3. Browser Run Reporting

The tester and viewer must report:

- parsed sections
- parsed tests
- browser-runnable tests
- unsupported tests
- executed actions
- executed helper assertions

Unsupported tests must be shown as skipped-with-reason, not silently omitted.

## Scope

### In Scope

- `src/cypress-form-tester.html`
  - capability-aware run preparation
  - richer payload generation
  - better run counts and status reporting
- `src/form-viewer.html`
  - richer payload handling
  - helper-aware browser execution
  - acknowledgement/reporting of runnable tests, helpers, and actions
- `src/test-generation-core.js`
  - normalized helper payload design
  - generation support for browser-executable helper assertions
- `cypress/support/commands.js`
  - keep as Cypress adapter layer for exported specs

### Out Of Scope

- full Cypress interpreter in browser
- arbitrary execution of generated `expect()` code strings
- broad calculation-behavior engine in first pass

## Acceptance Criteria

1. Browser run summary shows total parsed sections/tests, browser-runnable tests, unsupported tests, and actions/helpers executed.
2. Range tests can be represented explicitly in browser runs rather than disappearing.
3. Required-cardinality tests no longer depend only on inline opaque code if browser execution is desired.
4. Unsupported tests are visible with a reason.
5. Viewer acknowledgements include runnable-test/helper/action counts, not only `actions.length`.

## Implementation Steps

1. Define the normalized browser-run payload.
2. Add payload creation in `src/cypress-form-tester.html`.
3. Add payload handling and helper execution in `src/form-viewer.html`.
4. Extract shared helper semantics into `src/test-generation-core.js` where appropriate.
5. Keep Cypress command wrappers aligned in `cypress/support/commands.js`.
6. Update browser-run reporting to show runnable versus unsupported tests.

## Verification

1. Browser run reports what was parsed versus what was actually runnable.
2. Viewer acknowledges received runnable tests/helpers/actions, not only `actions.length`.
3. The design explicitly explains what `assertRangeSamples` and `hasRequiredCardinality` mean today and how each maps to the target runtime.
4. Source changes stay in `src`; `docs/demo` is refreshed only through build.