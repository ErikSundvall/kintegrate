# Browser Test Execution PRD - Cypress-First Alternative

## Problem

- The current browser tester tries to simulate Cypress by parsing generated test code and sending a reduced action list to `src/form-viewer.html`.
- That approach only covers a subset of generated tests and diverges from the real execution path.
- Generated tests already depend on Cypress commands and helpers such as `fillField`, `expectVisible`, `expectHidden`, `expectValue`, `formViewerReady`, and `assertRangeSamples`.
- A second homegrown executor increases drift, hides unsupported cases, and creates debugging confusion.

## Proposal

Use real Cypress to run generated tests against `form-viewer.html` instead of expanding the homegrown browser executor.

The tester UI should become a Cypress-oriented authoring and launch surface, not a second test runtime.

## Platform Constraint

- A static web app cannot launch Cypress directly by itself.
- Cypress is a local automation tool that needs process execution, browser automation control, and access to the local project/runtime environment.
- Browser features such as `localStorage` can store generated spec text, but they do not give the page permission to start Cypress, spawn local processes, or write directly into the workspace.
- Therefore, a pure static deployment can prepare test content but still needs a local companion mechanism to actually run Cypress.

## Goals

- Keep one real execution model for generated tests.
- Reuse existing Cypress commands and helpers.
- Run tests against the real `form-viewer.html` page in test mode.
- Make visual runs and headless runs use the same test logic.
- Reduce custom runtime logic in `src/cypress-form-tester.html` and `src/form-viewer.html`.

## Non-Goals

- Do not build a browser-side Cypress interpreter.
- Do not keep expanding the current flat-action executor as the main execution path.

## Current Assets To Reuse

- `cypress/support/commands.js`
  - `waitForFormTestApi`
  - `formViewerReady`
  - `fillField`
  - `expectVisible`
  - `expectHidden`
  - `expectValue`
  - `assertRangeSamples`
- `src/form-viewer.html`
  - test mode
  - `window.formTestApi`
  - Better renderer integration
- `src/test-generation-core.js`
  - grouped Cypress spec generation
- `src/cypress-form-tester.html`
  - generation UI
  - code preview
  - load/save workflow

## Target Design

### 1. Single Execution Engine

Generated tests are executed by Cypress only.

Two supported run modes:

1. Visual run
   - Launch Cypress open mode and run the selected generated spec against `form-viewer.html`.
2. Headless run
   - Launch Cypress run mode for CI or fast validation.

`src/cypress-form-tester.html` should stop pretending to execute tests itself.

### 2. Tester UI Role

The tester page remains responsible for:

- loading and parsing form definitions
- selecting generation scope
- generating grouped Cypress specs
- previewing/editing generated Cypress code
- saving/exporting specs
- launching Cypress with the current spec
- showing Cypress run output or status

The tester page should not be responsible for re-implementing Cypress assertions.

### 3. Launch Model

Preferred implementation:

- Persist the generated spec into a known workspace location, for example under `cypress/e2e/generated`, or hand it off to a local launcher that materializes it transiently.
- Launch Cypress against that spec through a local companion mechanism.
- Open or target `form-viewer.html?testMode=1&autoLoad=0` as part of the generated test flow.

Possible launch paths:

1. VS Code task or terminal command from the agent/workspace
2. small local launcher endpoint or desktop helper invoked by the tester UI
3. VS Code extension command or local native bridge
4. explicit manual "Save and run with Cypress" workflow

The first implementation can use a save-first, run-second workflow. A later implementation can support browser-side generation plus local launcher handoff without requiring the user to manually save a file.

### 4. Command And Helper Strategy

Keep Cypress commands as the primary adapter layer.

Needed follow-up:

- add a Cypress command for required-cardinality assertions instead of emitting only inline `hasRequiredCardinality` logic if reuse becomes valuable
- keep `assertRangeSamples` in Cypress
- move any reusable assertion math into shared pure helpers only if both generator and Cypress command layer benefit

`form-viewer.html` should expose stable APIs for Cypress via `window.formTestApi`, not absorb assertion logic that belongs in Cypress.

### 5. Visual Feedback

The tester UI should report Cypress-oriented states, for example:

- spec generated
- spec saved
- Cypress launched
- Cypress running
- pass/fail summary available

If detailed live progress is needed, it should come from Cypress results or a thin reporting bridge, not from a separate executor.

## Architecture

### Primary Flow

1. User loads a form in `src/cypress-form-tester.html`.
2. Generator creates grouped Cypress spec text.
3. Spec is saved to `cypress/e2e/generated/...generated.cy.js`.
4. Cypress runs that spec.
5. The spec opens `form-viewer.html?testMode=1&autoLoad=0`.
6. Cypress commands interact with `window.formTestApi` in the viewer.
7. Results are reported by Cypress.

### Resulting Separation

- `src/cypress-form-tester.html`
  - authoring, generation, save/run orchestration
- `src/form-viewer.html`
  - testable form runtime surface
- `cypress/support/commands.js`
  - execution and assertion adapter layer
- `src/test-generation-core.js`
  - generation rules and spec content

## Scope

### In Scope

- remove the homegrown executor from the critical path
- make generated specs the source of truth for execution
- add a Cypress-first run workflow from the tester UI
- improve generated test/helper reuse where needed
- preserve visible runs through Cypress open mode

### Out Of Scope

- arbitrary browser-only execution of generated test code without Cypress
- duplicating Cypress command behavior in `form-viewer.html`
- replacing Cypress with a custom runner

## Acceptance Criteria

1. A generated multi-section spec runs through Cypress without depending on the custom action executor.
2. Logic tests using `fillField`, `expectVisible`, `expectHidden`, and `expectValue` run through Cypress against `form-viewer.html`.
3. Range tests using `assertRangeSamples` run through Cypress through the existing command layer.
4. The tester UI can save the current generated spec and trigger a Cypress run workflow.
5. The same generated spec can be run visually and headlessly.
6. The custom browser executor is no longer the main or recommended execution path.

## Implementation Steps

1. Add a new run workflow in `src/cypress-form-tester.html` that saves the current spec as a Cypress file instead of extracting action lists.
2. Add a workspace command, script, or task to run Cypress for the saved spec.
3. Keep `src/form-viewer.html` focused on `formTestApi` stability for Cypress.
4. Decide whether required-cardinality assertions should stay inline or gain a dedicated Cypress command.
5. Update run status UI so it reflects spec save and Cypress launch state, not custom action playback.
6. Deprecate the current homegrown executor path.

## Risks

- Launching Cypress from a browser page is not possible without a local helper, extension, or explicit user-driven bridge.
- Visual run integration may be more operationally complex than the current popup executor.
- Some quick interactive preview behavior may need a lighter-weight fallback, but that fallback must not become the primary execution path.

## Verification

1. Save a generated spec with multiple `describe()` sections and run it in Cypress open mode.
2. Confirm the same spec runs in Cypress headless mode.
3. Confirm `assertRangeSamples` runs through Cypress and is not skipped.
4. Confirm the recommended workflow no longer depends on `actions.length` handoff to `form-viewer.html`.
5. Confirm source changes stay in `src`; `docs/demo` is refreshed only through build.