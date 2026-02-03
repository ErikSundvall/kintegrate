# PRD: Better Form Testing Tool (Cypress)

## 1. Introduction/Overview

This document describes a **standalone form testing tool** for Better EHR forms using the **Cypress** framework. The tool enables medical informaticians with limited programming experience to create, run, and maintain automated tests for Better forms—including testing dependencies (show/hide logic), calculations, and validations designed in Better's EHR Studio low-code environment.

**Scope note:** This PRD focuses exclusively on Cypress for the current phase. Playwright is out of scope.

**Problem Solved:** Currently, there's no easy way for non-developers to verify that complex form logic (dependencies, calculations) works correctly after changes. Manual testing is time-consuming and error-prone. This tool automates that process with a user-friendly interface.

## 2. Goals

1. **Enable non-developers** to create and run form tests without writing code
2. **Auto-generate tests** from Better form definitions, covering 100% of declared dependencies and calculations
3. **Provide visual feedback** so informaticians can see exactly what's being tested
4. **Run standalone** from the main kintegrate tool (separate npm package/directory)
5. **Support AI-assisted edge case generation** while keeping humans in control

## 3. User Stories

### US-1: Auto-Generate Tests from Form
> As a medical informatician, I want to upload a Better form definition and automatically generate tests for all dependencies and calculations, so I don't have to write test code manually.

### US-2: Visual Test Builder
> As a medical informatician, I want to build tests using a visual step-by-step builder with dropdown menus, so I can create custom tests without learning Cypress syntax.

### US-3: Run Tests Visually
> As a medical informatician, I want to see tests execute in real-time in a browser, stepping through each action, so I can understand what's being tested and debug failures.

### US-4: Review AI-Suggested Tests
> As a medical informatician, I want the system to suggest additional edge case tests using AI, but I want to review and approve them before they're added, so I stay in control.

### US-5: Export/Share Tests
> As a medical informatician, I want to export generated tests as files that developers can integrate into CI/CD pipelines, so test automation can be part of the deployment process.

## 4. Functional Requirements

### Core Functionality

1. **FR-1:** The system must parse Better form definition files (JSON) and extract:
   - All fields with their types and paths
   - Dependency rules (show/hide conditions)
   - Calculation expressions
   - Validation rules

2. **FR-2:** The system must generate Cypress test files that cover:
   - Each dependency rule (test visible when true, hidden when false, toggle behavior)
   - Each calculation (test with sample inputs, verify output)
   - Each validation (test valid/invalid inputs)

3. **FR-3:** The system must provide a web-based UI where users can:
   - Upload/load a form definition file
   - View discovered dependencies, calculations, and validations
   - Preview generated tests before saving
   - Modify test parameters (input values, expected results)

4. **FR-4:** The system must provide a visual "step builder" where users can:
   - Add test steps via dropdown menus (Fill Field, Expect Visible, Expect Hidden, Expect Value)
   - Select fields from a list populated from the form definition
   - Reorder and delete steps

5. **FR-5:** The system must integrate with Cypress Test Runner for visual test execution.

6. **FR-6:** The system must generate human-readable test names derived from the form structure (e.g., "Gestational age shows when pregnant is checked").

### AI Enhancement (Optional Feature)

7. **FR-7:** The system may optionally connect to an AI service (OpenAI API) to suggest additional edge case tests based on the form structure.

8. **FR-8:** AI-suggested tests must be presented to the user for review before being added to the test suite.

9. **FR-9:** Users must be able to accept, modify, or reject each AI suggestion individually.

### CLI & Integration

10. **FR-10:** The system must provide CLI commands:
    - `npm run test` - Run all tests headlessly
    - `npm run test:open` - Open Cypress visual runner
    - `npm run generate -- --form <path>` - Generate tests from form definition
    - `npm run ui` - Start the web UI for test building

11. **FR-11:** The system must be installable as a standalone npm package, independent of kintegrate.

## 5. Non-Goals (Out of Scope)

1. **Not a full kintegrate replacement** - This tool tests forms, not Handlebars template generation
2. **Not a Better Studio replacement** - This doesn't edit form definitions, only tests them
3. **Not a CI/CD platform** - Users integrate with their own CI/CD; we provide the tests
4. **No multi-user collaboration** - Single-user tool; team features are out of scope
5. **No automatic test execution on form save** - Tests are run manually or via CI/CD

## 6. Design Considerations

### UI/UX Requirements

- **Clean, minimal interface** suitable for non-technical users
- **No code visible by default** - code preview is optional
- **Clear visual feedback** on test results (green/red indicators)
- **Step-by-step wizard** for first-time users

### Mockup Reference

See: [mockup-cypress-form-tester.html](../src/mockups/mockup-cypress-form-tester.html)

### Design Principles

1. **Progressive disclosure** - Simple view first, advanced options hidden
2. **Familiar metaphors** - Steps work like a recipe
3. **Immediate feedback** - Show what will happen before running

---

## 7. Part 1 (Formulärlogiken): Deeper Design & Implementation Plan (Cypress)

### 7.1 Scope (Part 1)

**Primary goal:** Test *form logic* close to Better Studio, using the existing Kintegrate **form-viewer popup** and Cypress as the execution engine.

**In scope**
- Show/hide dependencies
- Calculations and derived fields
- Validation rules (required, min/max, regex, domain constraints)
- Minimal UI to run and observe tests, with readable steps

**Out of scope** (future parts)
- Narrative text generation tests (Part 2)
- Widget-specific component tests (Part 3)
- App-level integration tests (Part 4–5)

### 7.2 Architecture (leveraging current demo app)

```
┌──────────────────────────┐     postMessage     ┌────────────────────────────┐
│  Kintegrate Main App     │◄───────────────────►│ Form Viewer Popup          │
│  (index.html)            │                     │ (form-viewer.html)         │
└──────────┬───────────────┘                     └───────────┬────────────────┘
           │                                                 │
           │ local files / zip / server                      │
           ▼                                                 ▼
┌──────────────────────────┐     /mock-cdr/*     ┌────────────────────────────┐
│  Service Worker          │◄───────────────────►│ Better Form Renderer       │
│  (form-mock-sw.js)       │                     │ (Web Component)            │
└──────────┬───────────────┘                     └───────────┬────────────────┘
           │                                                 │
           ▼                                                 ▼
     Cypress Test Runner                               Form DOM + ScriptApi
```

**Key idea:** Cypress tests target the **form-viewer popup**, not the main app, so we test form logic *close to where it’s authored* while reusing the existing offline rendering infrastructure.

### 7.3 Test Harness (Form Viewer Mode)

Add a **Test Mode** in form-viewer.html:
- Exposes stable selectors for Cypress (e.g. `data-testid`, `data-field`, `data-path`)
- Exposes a lightweight JS test API on `window.formTestApi`
- Provides a “Test Session” banner to avoid confusion with clinical use

**Window API (example):**
```javascript
window.formTestApi = {
  isReady: () => !!formRenderer && formRenderer.classList.contains('loaded'),
  setFieldValue: (fieldTag, value) => formRenderer.getScriptApi().setFieldValue(fieldTag, value),
  getFieldValue: (fieldTag) => formRenderer.getScriptApi().getFieldValue(fieldTag),
  getComposition: () => formRenderer.getScriptApi().getComposition(),
  validate: () => formRenderer.validate(),
  show: (fieldTag) => formRenderer.getScriptApi().showFormElement(fieldTag),
  hide: (fieldTag) => formRenderer.getScriptApi().hideFormElement(fieldTag)
};
```

### 7.4 Selector Strategy (critical for Cypress)

Use a layered selector strategy to ensure tests survive UI changes:

1. **Primary:** `data-field="<tag>"` or `data-path="<ehrPath>"`
2. **Secondary:** label text (only for fallback)
3. **Tertiary:** CSS class (avoid for long-term tests)

If the Better renderer does not expose stable attributes, use a thin DOM-mapping layer in the popup to attach `data-field` attributes after render, using ScriptApi metadata and the renderer DOM.

### 7.4.1 Field Identifiers (Paths, Tags, and Containers)

**Key API detail:** ScriptApi methods accept **`tagOrPath`** where the identifier can be a **tag**, **alias**, or **path**. The `getFieldModel` response includes `aqlPath`, `isHidden`, and container metadata. This allows a **path-first strategy** for stable identifiers:

1. **Preferred:** `aqlPath` from the form model (stable across label changes)
2. **Fallback:** tag/alias from form-description
3. **Last resort:** DOM label text

**Container handling:** ScriptApi functions accept `searchWithinContainerTag` and `containerMultiIndex`. This is essential for repeated structures (multi-containers). The test generator must track container context when building identifiers.

**Coded text values:** `getFieldValue(tagOrPath, ..., simpleValue=true)` returns label for CODED_TEXT. For strict assertions, use `simpleValue=false` and compare `code` where applicable.

**Implication for generator:** Store a field index keyed by `aqlPath` and tag, and include container scope in generated steps.

### 7.5 Test Types & Templates

**Dependency rule**
```
Given: field A triggers visibility of field B
Test 1: A=false -> B hidden
Test 2: A=true  -> B visible
Test 3: A toggled -> B toggles
```

**Calculation**
```
Given: C = f(A,B)
Test: set A,B -> expect C
```

**Validation**
```
Test 1: invalid input -> error visible
Test 2: valid input -> error hidden
```

### 7.6 User Flow (Formulärlogiken)

1. **Open Form Viewer** (popup) from Kintegrate
2. **Load form package** (ZIP) or **connect to server**
3. Toggle **Test Mode** (adds selectors + enables Test API)
4. **Run autogenerated logic tests** (dependencies/calculations/validations)
5. Inspect failures and record custom steps

### 7.7 Implementation Steps (Phase-by-Phase)

**Phase A — Test Mode in Popup**
1. Add “Test Mode” toggle to toolbar
2. Expose `window.formTestApi`
3. Add consistent `data-testid`/`data-field` attributes

**Phase B — Cypress Harness**
1. Create `cypress/support/commands.js` for `fillField`, `expectVisible`, `expectValue`
2. Add `cy.formViewerReady()` helper (wait for renderer)
3. Add fixtures for sample forms

**Phase C — Generator (Logic Only)**
1. Parse `form-description` to extract rules
2. Generate baseline tests for each rule
3. Persist generated tests under `cypress/e2e/generated/`

**Phase D — Minimal UI**
1. Simple panel to load form and list discovered logic
2. “Run Tests” button that opens Cypress Runner
3. Show last run results (pass/fail count)

### 7.10 PoC Findings (Cypress + Form Viewer)

1. **ScriptApi is the most stable control surface.** Using `getScriptApi()` avoids brittle DOM selectors and works well with `tagOrPath`.
2. **`aqlPath` is the best long-term identifier.** It is available via `getFieldModel` and is less likely to change than labels.
3. **Test Mode should expose a minimal API.** A small `window.formTestApi` surface allows Cypress to drive the form without DOM coupling.
4. **Container scope must be explicit.** Repeated structures require `searchWithinContainerTag` and `containerMultiIndex` in generated steps.

**PoC location:** `tasks/cypress-poc/`

### 7.8 Test Execution Modes

1. **Local offline mode** (preferred for authoring)
   - Uses Service Worker `/mock-cdr`
   - Tests run against the popup

2. **Server mode** (optional)
   - Uses `ehrServerUrl` + credentials
   - Same tests, different configuration

### 7.9 Deliverables (Part 1)

- Updated form-viewer popup with Test Mode
- Cypress commands for core actions
- Generator that outputs logic tests
- Refined mockup for the Form Logic testing UI
- Minimal docs for running tests locally

## 8. Technical Considerations

### Dependencies

- **Cypress** (v13+) - Test framework
- **Node.js** (v18+) - Runtime
- **Express** (optional) - Serve web UI locally

### Architecture

```
form-testing-cypress/
├── cypress/
│   ├── e2e/generated/      # Auto-generated tests
│   ├── e2e/custom/         # User-created tests
│   ├── support/commands.js # Custom Cypress commands
│   └── fixtures/forms/     # Form definitions
├── test-generator/
│   ├── parser.js           # Parse Better form JSON
│   ├── generator.js        # Generate Cypress tests
│   └── ai-enhancer.js      # AI edge case suggestions
├── web-ui/
│   ├── index.html          # Main UI
│   └── app.js              # UI logic
├── cypress.config.js
└── package.json
```

### Integration Points

- Reads Better form definition JSON files
- Outputs standard Cypress test files (.cy.js)
- Can test forms served by kintegrate's dev server or any URL

### Constraints

- Cypress runs in-browser; cannot test multiple browser tabs in one test
- Cypress parallel execution requires paid Cypress Cloud (or self-hosted)

## 9. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test generation coverage | 100% of declared dependencies/calculations | Automated check |
| Informatician adoption | Can generate tests without developer help | User feedback |
| Test creation time | < 5 minutes for auto-generated suite | Timing measurement |
| False positive rate | < 5% of generated tests | Manual review |

## 10. Open Questions

1. **Q1:** Should we support Better form packages (.zip) directly, or require extracted JSON?
   - *Recommendation:* Support both; extract JSON from zip automatically

2. **Q2:** How should we handle forms that require authentication to load?
   - *Recommendation:* Allow configuration of auth headers/cookies in cypress.config.js

3. **Q3:** Should generated tests be committed to Git, or regenerated on each run?
   - *Recommendation:* Commit them; allows manual customization and version tracking

4. **Q4:** What's the minimum form viewer URL structure we need to support?
   - *Recommendation:* Support query param `?form=<name>` or `?template=<path>`
