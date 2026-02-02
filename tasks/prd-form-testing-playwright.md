# PRD: Better Form Testing Tool (Playwright)

## 1. Introduction/Overview

This document describes a **standalone form testing tool** for Better EHR forms using the **Playwright** framework. The tool enables medical informaticians with limited programming experience to create, run, and maintain automated tests for Better forms—including testing dependencies (show/hide logic), calculations, and validations designed in Better's EHR Studio low-code environment.

**Problem Solved:** Currently, there's no easy way for non-developers to verify that complex form logic (dependencies, calculations) works correctly after changes. Manual testing is time-consuming and error-prone. This tool automates that process with a user-friendly interface, while leveraging Playwright's powerful features like test recording and cross-browser support.

**Why Playwright:** Playwright offers free parallel test execution, cross-browser support (including Safari/WebKit), and a built-in test recorder (codegen) that lets non-developers create tests by clicking through forms.

## 2. Goals

1. **Enable non-developers** to create and run form tests without writing async/await code
2. **Leverage Playwright Codegen** for recording tests by clicking (no coding required)
3. **Auto-generate tests** from Better form definitions, covering 100% of declared dependencies and calculations
4. **Provide visual feedback** via Playwright's UI mode and Trace Viewer
5. **Run standalone** from the main kintegrate tool (separate npm package/directory)
6. **Support AI-assisted edge case generation** while keeping humans in control

## 3. User Stories

### US-1: Record Test by Clicking
> As a medical informatician, I want to record a test by clicking through a form in the browser, so I can create tests without writing any code.

### US-2: Auto-Generate Tests from Form
> As a medical informatician, I want to upload a Better form definition and automatically generate tests for all dependencies and calculations, so I don't have to write test code manually.

### US-3: Visual Step Builder
> As a medical informatician, I want to build tests using a visual step-by-step builder with dropdown menus, so I can create custom tests without learning Playwright syntax.

### US-4: Run Tests with Visual Feedback
> As a medical informatician, I want to see test results in an interactive UI that shows what passed and failed, so I can understand issues without reading code.

### US-5: Debug Failures with Trace Viewer
> As a medical informatician, when a test fails I want to see a timeline of screenshots showing exactly what happened, so I can understand and report the issue.

### US-6: Review AI-Suggested Tests
> As a medical informatician, I want the system to suggest additional edge case tests using AI, but I want to review and approve them before they're added, so I stay in control.

### US-7: Test on Multiple Browsers
> As a quality assurance person, I want to run the same tests on Chrome, Firefox, and Safari, so I can ensure forms work across all browsers users might have.

## 4. Functional Requirements

### Core Functionality

1. **FR-1:** The system must parse Better form definition files (JSON) and extract:
   - All fields with their types and paths
   - Dependency rules (show/hide conditions)
   - Calculation expressions
   - Validation rules

2. **FR-2:** The system must generate Playwright test files that cover:
   - Each dependency rule (test visible when true, hidden when false, toggle behavior)
   - Each calculation (test with sample inputs, verify output)
   - Each validation (test valid/invalid inputs)

3. **FR-3:** The system must use a **simplified test syntax** that hides async/await complexity:
   ```javascript
   // Instead of async/await, informaticians see:
   formTest('BMI calculates correctly', [
     { action: 'fill', field: 'weight', value: '70' },
     { action: 'fill', field: 'height', value: '1.75' },
     { action: 'expectValue', field: 'bmi', value: '22.9' }
   ])
   ```

4. **FR-4:** The system must provide a web-based UI where users can:
   - Upload/load a form definition file
   - View discovered dependencies, calculations, and validations
   - Preview generated tests before saving
   - Launch Playwright Codegen to record new tests

5. **FR-5:** The system must provide a visual "step builder" where users can:
   - Add test steps via dropdown menus (Fill Field, Expect Visible, Expect Hidden, Expect Value, Click, Wait)
   - Select fields from a list populated from the form definition
   - Reorder and delete steps

6. **FR-6:** The system must integrate with Playwright's UI Mode (`--ui` flag) for visual test execution.

7. **FR-7:** The system must automatically collect traces on test failures for debugging.

8. **FR-8:** The system must generate human-readable test names derived from the form structure.

### Test Recording (Playwright Codegen)

9. **FR-9:** The system must provide a one-click "Record Test" button that launches Playwright Codegen pointed at the form viewer.

10. **FR-10:** Recorded tests must be automatically saved to the custom tests directory.

11. **FR-11:** The system should attempt to convert recorded tests to the simplified syntax where possible.

### AI Enhancement (Optional Feature)

12. **FR-12:** The system may optionally connect to an AI service (OpenAI API) to suggest additional edge case tests based on the form structure.

13. **FR-13:** AI-suggested tests must be presented to the user for review before being added to the test suite.

14. **FR-14:** Users must be able to accept, modify, or reject each AI suggestion individually.

### CLI & Integration

15. **FR-15:** The system must provide CLI commands:
    - `npm run test` - Run all tests headlessly (parallel by default)
    - `npm run test:ui` - Open Playwright UI mode
    - `npm run test:headed` - Run tests with visible browser
    - `npm run record` - Launch Playwright Codegen to record a test
    - `npm run generate -- --form <path>` - Generate tests from form definition
    - `npm run report` - Open HTML test report
    - `npm run trace` - Open Trace Viewer for debugging
    - `npm run ui` - Start the web UI for test building

16. **FR-16:** The system must be installable as a standalone npm package, independent of kintegrate.

17. **FR-17:** The system must support running tests on Chromium, Firefox, and WebKit browsers.

## 5. Non-Goals (Out of Scope)

1. **Not a full kintegrate replacement** - This tool tests forms, not Handlebars template generation
2. **Not a Better Studio replacement** - This doesn't edit form definitions, only tests them
3. **Not a CI/CD platform** - Users integrate with their own CI/CD; we provide the tests
4. **No multi-user collaboration** - Single-user tool; team features are out of scope
5. **No automatic test execution on form save** - Tests are run manually or via CI/CD
6. **No mobile device testing** - Viewport emulation only, not real devices

## 6. Design Considerations

### UI/UX Requirements

- **Clean, minimal interface** suitable for non-technical users
- **"Record" button prominently featured** - Codegen is the easiest path for non-developers
- **No async/await visible** - The simplified syntax abstracts this away
- **Clear visual feedback** on test results (green/red indicators)
- **Step-by-step wizard** for first-time users

### Mockup Reference

See: [mockup-playwright-form-tester.html](../src/mockups/mockup-playwright-form-tester.html)

### Design Principles

1. **Recording first** - Encourage users to record tests before writing them
2. **Progressive disclosure** - Simple view first, advanced options hidden
3. **Familiar metaphors** - Steps work like a recipe
4. **Immediate feedback** - Show what will happen before running

### Addressing Async/Await Complexity

The `formTest()` wrapper function completely hides async/await from informaticians:

```javascript
// What the user sees/edits (no async/await):
formTest('Field shows when checkbox checked', [
  { action: 'expectHidden', field: 'target-field' },
  { action: 'fill', field: 'checkbox', value: true },
  { action: 'expectVisible', field: 'target-field' }
])

// What actually runs (hidden from user):
test('Field shows when checkbox checked', async ({ page }) => {
  const form = new FormHelper(page)
  await page.goto('/form-viewer.html')
  await expect(page.locator('[data-field="target-field"]')).toBeHidden()
  await form.fillField('checkbox', true)
  await expect(page.locator('[data-field="target-field"]')).toBeVisible()
})
```

## 7. Technical Considerations

### Dependencies

- **Playwright** (v1.40+) - Test framework
- **Node.js** (v18+) - Runtime
- **Express** (optional) - Serve web UI locally

### Architecture

```
form-testing-playwright/
├── tests/
│   ├── generated/          # Auto-generated tests
│   └── custom/             # User-created/recorded tests
├── lib/
│   ├── simple-test.js      # formTest() wrapper hiding async/await
│   ├── form-helpers.js     # Form interaction utilities
│   └── test-fixtures.js    # Playwright fixtures
├── test-generator/
│   ├── parser.js           # Parse Better form JSON
│   ├── generator.js        # Generate Playwright tests
│   └── ai-enhancer.js      # AI edge case suggestions
├── web-ui/
│   ├── index.html          # Main UI
│   └── app.js              # UI logic
├── playwright.config.js
└── package.json
```

### Integration Points

- Reads Better form definition JSON files
- Outputs Playwright test files (.spec.js)
- Can test forms served by kintegrate's dev server or any URL
- Integrates with Playwright's Codegen for recording

### Playwright-Specific Advantages

| Feature | Benefit |
|---------|---------|
| Codegen | Record tests by clicking—no code needed |
| UI Mode | Interactive test explorer with time-travel |
| Trace Viewer | Rich debugging for failures |
| Parallel by default | Free parallelization (vs Cypress paid) |
| WebKit support | Test Safari without macOS |

### Constraints

- Async/await is inherent to Playwright; our wrapper mitigates but doesn't eliminate complexity for advanced customization
- Codegen generates raw Playwright code; conversion to simplified syntax may not always be perfect

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test generation coverage | 100% of declared dependencies/calculations | Automated check |
| Informatician adoption | Can generate tests without developer help | User feedback |
| Test creation time (recording) | < 2 minutes to record a basic test | Timing measurement |
| Test creation time (auto-gen) | < 5 minutes for full suite | Timing measurement |
| Cross-browser pass rate | Same tests pass on all 3 browsers | CI metrics |
| False positive rate | < 5% of generated tests | Manual review |

## 9. Open Questions

1. **Q1:** Should we support Better form packages (.zip) directly, or require extracted JSON?
   - *Recommendation:* Support both; extract JSON from zip automatically

2. **Q2:** How should we handle forms that require authentication to load?
   - *Recommendation:* Use Playwright's `storageState` for auth persistence; document setup process

3. **Q3:** Should generated tests be committed to Git, or regenerated on each run?
   - *Recommendation:* Commit them; allows manual customization and version tracking

4. **Q4:** How do we handle Codegen output that doesn't match our simplified syntax?
   - *Recommendation:* Save as-is in `custom/` folder; provide migration tool for advanced users

5. **Q5:** Should we default to all browsers or just Chromium?
   - *Recommendation:* Default to Chromium only for speed; enable all browsers via config flag

6. **Q6:** How complex should the simplified syntax be?
   - *Recommendation:* Start with 6 actions (fill, click, expectVisible, expectHidden, expectValue, wait); expand based on feedback
