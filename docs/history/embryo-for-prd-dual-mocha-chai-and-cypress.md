# PRD: Better.care In-App Test Emulator

## 1. Product Overview
**Objective:** Build/improve a lightweight, in-browser testing engine that emulates the Cypress API (`describe`, `it`, `cy.get`, etc.) using Mocha/Chai. This tool will validate Better.care form logic (e.g., calculations, validations, visibility) directly within the web application without requiring a separate Node.js/Electron test environment.
**Core Concept:** Wrap the Better.care `ScriptApi` in a chainable, asynchronous API that mimics Cypress, utilizing Mocha and Chai as the underlying browser-based test execution and assertion engines.

### 1.1 Purpose and Context - The Need for a Hybrid Testing Approach

This Product Requirements Document outlines the development of a **Hybrid Testing Framework** for the Better.care form renderer. The goal is to establish a robust, two-tiered validation strategy that maximizes efficiency while ensuring comprehensive reliability.

#### 1.1.1 In-App Emulation (Mocha/Chai)
The **In-App Test Emulator** allows us to validate the core business logic of Better.care forms directly within the web application environment using browser-based Mocha and Chai frameworks.

*   **Efficiency:** This approach is crucial for immediate feedback during development. It allows form designers and developers to instantly run "smoke tests" and validate complex scripting, calculations, conditional logic, and data transformations via the `ScriptApi` as soon as the form is rendered.
*   **Decoupled Logic:** The in-app emulator verifies the *logic* of the form independent of specific browser environments, ensuring the foundational rules are sound before comprehensive deployment.

#### 1.1.2 Complementary Desktop Testing (Cypress)
While in-app emulation confirms core logic, it is critical to understand its limitations. A purely in-app approach **cannot** guarantee that the form renderer functions correctly across all disparate web browsers and environments.

*   **Real Browser Verification:** Web components and rendering engines behave differently across browsers (e.g., Chrome, Firefox, Edge, Electron). A critical component like the Better.care renderer could be fundamentally broken in certain environments, leading to runtime errors that only **Cypress desktop tests** can reliably detect.
*   **Comprehensive Coverage:** Cypress tests running on the desktop provide essential end-to-end (E2E) validation, simulating real user interactions, testing accessibility, monitoring network performance, and ensuring cross-browser compatibility—factors that cannot be fully verified by logic-focused, in-app scripts.

#### 1.1.3 Combination and reuse
The combination of lightweight, immediate in-app testing and robust, cross-browser Cypress execution provides a comprehensive and resilient validation framework.

We want to reuse, maintain and version control exactly the same test definition files/suites both for in app testing and Cypress. Thus if some kinds of test in the file/suite are technically impossibl to run in one of the environments, it should be skipped in that environment (and noted why).

## 2. Technical Stack & Dependencies
* **Test Runner:** Mocha (Browser build via CDN or bundled).
* **Assertion Library:** Chai (Browser build via CDN or bundled).
* **Target API:** Better.care Form Renderer `ScriptApi`. Do note local quickstart in docs/FORM-RENDERER-REFERENCE.md
* **UI/Reporter:** Vanilla JavaScript/CSS for a side-panel or modal overlay (or default Mocha HTML reporter). Parts of this is already available in the src/cypress-form-tester.html

## 3. Scope & Constraints
* **In Scope:** * Emulating structural blocks (`describe`, `context`, `it`, `before`, `beforeEach`, `.only`, `.skip`).
    * Emulating core assertions via Chai (e.g., `.should('equal', value)`).
    * A Custom Command API to map Cypress interactions to Better.care `ScriptApi` methods.
    * A basic UI overlay to display passing/failing tests.
* **Out of Scope:** * Network interception (`cy.intercept`).
    * Browser-level interactions (cookies, local storage, tab manipulation).
    * Time travel / DOM snapshots (Standard Cypress UI features).

## 4. Core Requirements & Architecture

### 4.1. The Execution Engine (Mocha/Chai)
The system must initialize Mocha in the browser context (`mocha.setup('bdd')`) and expose the standard BDD interfaces (`describe`, `it`, etc.) globally so that test scripts can be written exactly like standard Cypress spec files.

### 4.2. The Chainable `cy` Emulator Object
The system must expose a global `cy` object. Like Cypress, commands executed on `cy` should not run immediately; they must be enqueued and executed sequentially to handle the asynchronous nature of UI updates.
* **Implementation Note for AI:** Implement a simple Promise-based command queue. When a user calls `cy.get()`, it pushes a command to the queue. 

### 4.3. Custom Command Registry (The Translation Layer)
To allow seamless translation from native Cypress syntax to Better.care `ScriptApi` calls, the system must implement a `cy.addCommand` (or `Cypress.Commands.add`) method.

**Design Pattern for AI:**
```javascript
// AI Instruction: Implement a registry that accepts a command name and a callback.
// The context 'this' or the first argument should represent the yielded subject from the previous command.

cy.addCommand('get', (fieldId) => {
  // Translate to Better.care API
  return renderer.scriptApi.getFieldValue(fieldId);
});

cy.addCommand('type', (subject, value) => {
  // 'subject' is yielded from the previous command (e.g., 'get')
  renderer.scriptApi.setFieldValue(subject, value);
  return subject; // yield for further chaining
});
```

### 4.4. Base Command Implementations
The AI must implement the following base mappings using the Custom Command Registry:

| Cypress Emulated Command | Expected Better.care `ScriptApi` Translation |
| :--- | :--- |
| `cy.get(fieldId)` | Stores the `fieldId` as the current subject. |
| `.type(value)` | Calls `ScriptApi.setFieldValue(currentSubject, value)`. |
| `.should('eq', expected)` | Fetches `ScriptApi.getFieldValue(currentSubject)` and asserts via `chai.expect()`. |
| `.should('be.visible')` | Checks Better.care visibility state for the `currentSubject`. |
| `.click()` | Triggers a Better.care button click or boolean toggle via `ScriptApi`. |


No problem at all.

### 4.5. Logic Portability and Reusability

To ensure that the test scripts can be used across both the emulated and native Cypress environments, the core functionality must be abstracted.

**Implementation Strategy:**
1.  **Extract Core Functions:** Separate logic—such as complex calculations, data transformations, or multi-step validation that aren't directly tied to the `cy` command or DOM interaction—into pure, reusable JavaScript modules.
2.  **Integration:**
    *   **Cypress:** Within your native custom commands, invoke these core functions directly. This maintains the chainable Cypress syntax while keeping the logic decoupled.
    *   **Mocha/Chai:** In the emulated runner, you can call the same pure functions directly within your `it` blocks.


## 5. User Interface (The Reporter)
* A first version of a test runner UI is available in /src/cypress-form-tester.html
* It must listen to Mocha's runner events or similar (`runner.on('pass')`, `runner.on('fail')`) to update the UI in real-time.
* Errors thrown by Chai assertions must be caught and displayed cleanly beneath the failing test in the UI.

## 6. Example Target Test Script
The final system must be able to successfully execute a script written exactly like this:

```javascript
describe('Patient Assessment Form', () => {
  beforeEach(() => {
    // Reset form via Better.care API
    renderer.scriptApi.resetForm();
  });

  it('calculates risk score based on age and smoking status', () => {
    cy.get('patient_age').type(45);
    cy.get('is_smoker').click(); // Assuming boolean toggle

    cy.get('total_risk_score').should('eq', 15);
  });

  it.skip('shows pregnancy fields for female patients', () => {
    // Should be skipped by the Mocha engine
  });
});
```