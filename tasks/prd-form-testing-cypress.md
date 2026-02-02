# PRD: Better Form Testing Tool (Cypress)

## 1. Introduction/Overview

This document describes a **standalone form testing tool** for Better EHR forms using the **Cypress** framework. The tool enables medical informaticians with limited programming experience to create, run, and maintain automated tests for Better forms—including testing dependencies (show/hide logic), calculations, and validations designed in Better's EHR Studio low-code environment.

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

## 7. Technical Considerations

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

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test generation coverage | 100% of declared dependencies/calculations | Automated check |
| Informatician adoption | Can generate tests without developer help | User feedback |
| Test creation time | < 5 minutes for auto-generated suite | Timing measurement |
| False positive rate | < 5% of generated tests | Manual review |

## 9. Open Questions

1. **Q1:** Should we support Better form packages (.zip) directly, or require extracted JSON?
   - *Recommendation:* Support both; extract JSON from zip automatically

2. **Q2:** How should we handle forms that require authentication to load?
   - *Recommendation:* Allow configuration of auth headers/cookies in cypress.config.js

3. **Q3:** Should generated tests be committed to Git, or regenerated on each run?
   - *Recommendation:* Commit them; allows manual customization and version tracking

4. **Q4:** What's the minimum form viewer URL structure we need to support?
   - *Recommendation:* Support query param `?form=<name>` or `?template=<path>`
