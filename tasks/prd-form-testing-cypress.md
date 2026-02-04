# PRD: Better Form Testing Tool (Cypress)

## 1. Introduction
Independent Cypress-based testing tool for Better EHR forms. Enables medical informaticians with limited programming experience to create, run, and maintain automated tests for Better forms—including testing dependencies (show/hide logic), calculations, and validations designed in Better's EHR Studio low-code environment.

The tool enables medical informaticians with limited programming experience to create, run, and maintain automated tests for 

**Problem:** Manual verification of complex form logic (dependencies, calculations) is error-prone and slow. Automated testing is typically inaccessible to non-developers.

## 2. Goals
1. **No-Code Testing:** Enable informaticians to create/run tests; optional code editor for advanced users.
2. **Auto-Generation:** Generate tests for 100% of declared dependencies (calculations, visibility).
3. **Visual Feedback:** Execute tests visibly in-browser for debugging and verification.
4. **Standalone:** Run independently from the main Kintegrate application.
5. **AI-Assisted:** Suggest edge case tests with human review/approval.

## 3. User Stories

### US-1: Auto-Generate Tests
> As a medical informatician, I want to auto-generate tests from a form definition (uploaded from from Better Studio) so I don't have to write code manually.

### US-2: Visual Test Builder
> As a medical informatician, I want to build tests using a visual builder so that I do not necessarily need to know Cypress syntax.

### US-3: Run Tests Visually
> As a medical informatician, I want to be able to see tests execute in real-time in a browser, stepping through each action, so I can understand what's being tested and debug failures. (But we also want a headless mode for CI/CD flows etc.)

### US-4: Review AI Tests
> As a medical informatician, I want to review/approve AI-suggested edge case tests.

### US-5: Export/Share Tests
> As a medical informatician, I want to export generated tests as files that developers can integrate into CI/CD pipelines, so test automation can be part of the deployment process.

### US-6: Select Auto-Generation Categories
> As a medical informatician, I want to select which categories (form logic, value ranges, calculations, validations, required fields) are auto-generated, so I can control the scope of test creation.

### US-7: GitHub Storage
> I want to load/save tests to a GitHub repository for versioning and easy sharing.

### US-8: Optional Code Editing
> As a medical informatician (or developer), I want to optionally edit or add tests using Cypress code, so advanced users can fine-tune generated tests.

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

7. **FR-7:** The system must allow users to select which categories are auto-generated (e.g., form logic, value ranges, calculations, validations, required fields).

8. **FR-8:** The system must allow users to load and store tests in a user-selected GitHub repository (including branch and target folder).

9. **FR-9:** The system must provide an optional Cypress code editor (read/write) that can create new tests or adjust generated ones.

### AI Enhancement (Optional Feature)

10. **FR-10:** The system may optionally connect to an AI service of user's choice (via API) to suggest additional edge case tests based on the form structure.

11. **FR-11:** AI-suggested tests must be presented to the user for review before being added to the test suite.

12. **FR-12:** Users must be able to accept, modify, or reject each AI suggestion individually.

### CLI & Integration

13. **FR-13:** The system must provide CLI commands:
    - `npm run test` - Run all tests headlessly
    - `npm run test:open` - Open Cypress visual runner
    - `npm run generate -- --form <path>` - Generate tests from form definition
    

## 5. Non-Goals (Out of Scope)

1. **Not a full kintegrate replacement** - This tool tests forms, not Handlebars template generation
2. **Not a Better Studio replacement** - This doesn't edit form definitions, only tests them
3. **Not a CI/CD platform** - Users integrate with their own CI/CD; we provide the tests
4. **No multi-user collaboration** - Single-user tool; team features are out of scope
5. **No automatic test execution on form save** - Tests are run manually or via CI/CD

## 6. Design Considerations

### UI/UX
- **Minimalist:** Suitable for non-technical users.
- **Visual Feedback:** Clear pass/fail indicators.
- **Guided:** Wizard approach for new users.

### Mockups
- [mockup-cypress-form-tester.html](../src/mockups/mockup-cypress-form-tester.html) - also [via githack](https://raw.githack.com/ErikSundvall/kintegrate/main/src/mockups/mockup-cypress-form-tester.html)
- [mockup-cypress-form-tester-alt-dashboard.html](../src/mockups/mockup-cypress-form-tester-alt-dashboard.html) - also [via githack](https://raw.githack.com/ErikSundvall/kintegrate/main/src/mockups/mockup-cypress-form-tester-alt-dashboard.html)
- [mockup-cypress-form-tester-alt-wizard.html](../src/mockups/mockup-cypress-form-tester-alt-wizard.html) - also [via githack](https://raw.githack.com/ErikSundvall/kintegrate/main/src/mockups/mockup-cypress-form-tester-alt-wizard.html)
- [mockup-cypress-form-tester-alt-studio.html](../src/mockups/mockup-cypress-form-tester-alt-studio.html) - also [via githack](https://raw.githack.com/ErikSundvall/kintegrate/main/src/mockups/mockup-cypress-form-tester-alt-studio.html)

(Archived: [mockup-playwright-form-tester.html](../docs/history/mockup-playwright-form-tester.html))

### Design Principles

1. **Progressive disclosure** - Simple view first, advanced options hidden
2. **Familiar metaphors** - Steps work like a recipe
3. **Immediate feedback** - Show what will happen before running

---

## 7. Implementation Plan (Part 1: Logic)

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

### 7.3 Test Harness
**Form Viewer (`form-viewer.html`):**
- **Test Mode (`testMode=1`):** Adds selectors, exposes `window.formTestApi`, shows "TEST MODE" badge.
- **Auto Load (`autoLoad=0`):** Prevents automatic default form loading for test handling.

**Window API:**
```javascript
window.formTestApi = {
  isReady: () => !!formRenderer && formRenderer.classList.contains('loaded'),
  setFieldValue: (tagOrPath, value) => scriptApi.setFieldValue(tagOrPath, value),
  getFieldValue: (tagOrPath) => scriptApi.getFieldValue(tagOrPath),
  getComposition: () => scriptApi.getComposition(),
  validate: () => formRenderer.validate(),
  show: (tagOrPath) => scriptApi.showFormElement(tagOrPath),
  hide: (tagOrPath) => scriptApi.hideFormElement(tagOrPath)
};
```

### 7.4 Selector Strategy
Reliable selection is critical for generated tests.

1. **Primary:** `aqlPath` (Stable, semantic).
2. **Secondary:** `tag` or `alias` (Stable if managed well).
3. **Fallback:** Label text (Brittle).

#### 7.4.1 Field Identifiers & AQL Paths
The Better ScriptApi handles `tagOrPath`. **`aqlPath` is preferred** as it remains stable across UI layout/label changes.
- **Paths:** Use `getFieldModel()` to resolve `aqlPath`.
- **Containers:** Repeated structures require `searchWithinContainerTag` and `containerMultiIndex`. The generator must track container context.
- **Coded Text:** `getFieldValue` returns labels by default; use `simpleValue=false` for code comparisons.

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
4. **Select auto-generation categories** (logic, calculations, validations, value ranges, required fields)
5. (Optional) **Connect GitHub repo** for load/save of tests
6. **Run autogenerated tests** (based on selected categories)
7. Inspect failures and record custom steps
8. (Optional) **Edit tests in Cypress code view** for advanced customization

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
2. Category selector for auto-generation scope
3. “Run Tests” button that opens Cypress Runner
4. Show last run results (pass/fail count)

**Phase E — GitHub + Code Editor**
1. GitHub repo connect (owner/repo, branch, folder)
2. Load/save test suites to repo
3. Optional Cypress code editor (read/write) with validation - Note that we already use CodeMirror in Kintegrate, consider reusing that (possibly adding some Cypress mode if available).

### 7.8 Execution Modes
1. **Local (Offline):** Service Worker mock (Authoring).
2. **Server:** Live EHR connection (Integration).

### 7.9 Deliverables
- Test-enabled Form Viewer.
- Cypress Command Library.
- Logic Test Generator.
- Testing UI.
- Documentation.

### 7.10 PoC Findings
1. **API Control:** `window.formTestApi` -> `scriptApi` is robust.
2. **Identifiers:** `aqlPath` is superior to DOM selectors; Better ScriptAPI handles `tagOrPath` effectively.
3. **Containers:** Explicit container scope is required for multi-value fields.
4. **URL Control:** `testMode` and `autoLoad` params are effective for test setup.

## 8. Technical Considerations

### Dependencies

- **Cypress** (v13+) - Test framework
- **Node.js** (v18+) - Runtime

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
- Can load/save test suites from a user-selected GitHub repository

### Constraints

- Cypress runs in-browser; cannot test multiple browser tabs in one test
- Cypress parallel execution requires paid Cypress Cloud (or self-hosted)
- GitHub integration requires an auth flow (token or OAuth) suitable for non-developers

## 9. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test generation coverage | 100% of declared dependencies/calculations | Automated check |
| Informatician adoption | Can generate tests without developer help | User feedback |
| Test creation time | < 5 minutes for auto-generated suite | Timing measurement |
| False positive rate | < 5% of generated tests | Manual review |
| Advanced edit success | Users can adjust tests in code view without breaking runs | Usability testing |

## 10. Open Questions

1. **Q1:** Should we support Better form packages (.zip) directly, or require extracted JSON?
   - *Recommendation:* Support both; extract JSON from zip automatically

2. **Q2:** How should we handle forms that require authentication to load?
   - *Recommendation:* Allow configuration of auth headers/cookies in cypress.config.js

3. **Q3:** Should generated tests be committed to Git, or regenerated on each run?
   - *Recommendation:* Commit them; allows manual customization and version tracking

4. **Q4:** What's the minimum form viewer URL structure we need to support?
   - *Recommendation:* Support query param `?form=<name>` or `?template=<path>`

5. **Q5:** Which mockup direction should we pursue for the first functional prototype (dashboard, wizard, or studio layout)?

6. **Q6:** Where should the optional Cypress code editor live in the UI (tab switch, split view, or separate advanced mode)?

7. **Q7:** How should GitHub integration be handled for non-developers (OAuth app, PAT, or device flow), and should we support read-only browsing of existing repos before connecting?

8. **Q8:** How granular should auto-generation category controls be (simple toggles vs. advanced per-rule sliders for test depth)?

9. **Q9:** Should mockups emphasize “quick start” (single-screen dashboard) or “guided onboarding” (wizard), given the target informatician audience?
