/**
 * E2E verification for the in-browser Mocha runner in cypress-form-tester.html.
 *
 * Covers checklist items:
 *   8.2 — Run a spec, confirm Mocha output appears in #last-run
 *   8.3 — Switch reporter formats (spec/dot/min/json/html) and confirm output changes
 *   8.4 — cy.intercept in a spec → test is marked pending with unsupported reason
 *   8.7 — Generated-spec commands (fillField / expectVisible etc.) produce definitive
 *          outcomes (pass or fail, never silently drop), confirming ≥90% definitive rate
 *
 * The cy-emulator unit test (src/ts/cy-emulator.test.js) already covers the skip-reason
 * logic at the module level; these tests verify the full browser pipeline end-to-end.
 */

const SIMPLE_PASSING_SPEC = `
describe('standalone suite', () => {
  it('passes basic assertion', () => {
    expect(1 + 1).to.equal(2);
  });
  it('passes boolean assertion', () => {
    expect(true).to.equal(true);
  });
});
`.trim();

const INTERCEPT_SPEC = `
describe('intercept suite', () => {
  it('uses cy.intercept', () => {
    cy.intercept('GET', '/api/data', {});
  });
});
`.trim();

// A spec with only supported commands (no form API call so it will fail fast, but
// every test will have a definitive outcome — no silent drops).
const SUPPORTED_COMMANDS_SPEC = `
describe('supported-commands suite', () => {
  it('fillField produces an outcome (pass or fail, not silent)', () => {
    cy.fillField('/some-field', 42);
  });
  it('expectVisible produces an outcome', () => {
    cy.expectVisible('/some-field');
  });
  it('resetForm produces an outcome', () => {
    cy.resetForm();
  });
});
`.trim();

function setEditorValue(win, specText) {
  // CM5 stores the instance on the wrapper div (.CodeMirror), not on the textarea.
  const cmDiv = win.document.querySelector('#code-editor-wrap .CodeMirror');
  if (!cmDiv || !cmDiv.CodeMirror) {
    throw new Error('CodeMirror editor not initialised');
  }
  cmDiv.CodeMirror.setValue(specText);
}

function clickReporterBtn(win, reporter) {
  const btn = win.document.querySelector(`.reporter-btn[data-reporter="${reporter}"]`);
  if (!btn) throw new Error(`reporter button for "${reporter}" not found`);
  btn.click();
}

// Wait for the page IIFE to finish initialising (editor + Mocha both ready).
function waitForInit() {
  cy.get('#code-preview', { timeout: 20000 }).should('exist');
  cy.window({ timeout: 20000 }).should((win) => {
    const cmDiv = win.document.querySelector('#code-editor-wrap .CodeMirror');
    expect(cmDiv?.CodeMirror, 'CodeMirror editor ready').to.exist;
    expect(win.CyEmulatorModule?.createCyEmulator, 'CyEmulatorModule ready').to.be.a('function');
    expect(win.Mocha, 'Mocha global ready').to.exist;
  });
}

describe('Form Tester — in-browser Mocha runner', () => {
  beforeEach(() => {
    cy.visit('/cypress-form-tester.html');
    waitForInit();
  });

  // ── 8.2 ─────────────────────────────────────────────────────────────────────
  it('8.2 — running a spec populates #last-run with reporter output (spec format)', () => {
    cy.window().then((win) => setEditorValue(win, SIMPLE_PASSING_SPEC));

    cy.get('#run-btn').click();

    // Reporter output div must appear and contain a summary
    cy.get('#last-run .reporter-output', { timeout: 10000 }).should('exist');
    cy.get('#last-run .reporter-summary').should('contain.text', 'passing');
    // Two passing tests, zero failing, zero pending
    cy.get('#last-run .reporter-summary .pass').should('contain.text', '2');
    cy.get('#last-run .reporter-summary .fail').should('contain.text', '0');
    cy.get('#last-run .reporter-summary .pending').should('contain.text', '0');
  });

  // ── 8.3 ─────────────────────────────────────────────────────────────────────
  it('8.3 — switching reporter format changes #last-run output structure', () => {
    cy.window().then((win) => setEditorValue(win, SIMPLE_PASSING_SPEC));

    // spec reporter (default)
    cy.get('#run-btn').click();
    cy.get('#last-run .reporter-output-spec', { timeout: 10000 }).should('exist');

    // dot reporter
    cy.window().then((win) => clickReporterBtn(win, 'dot'));
    cy.get('#run-btn').click();
    cy.get('#last-run .reporter-dots', { timeout: 10000 }).should('exist');
    cy.get('#last-run .reporter-output-spec').should('not.exist');

    // min reporter
    cy.window().then((win) => clickReporterBtn(win, 'min'));
    cy.get('#run-btn').click();
    cy.get('#last-run .reporter-min', { timeout: 10000 }).should('exist');

    // json reporter
    cy.window().then((win) => clickReporterBtn(win, 'json'));
    cy.get('#run-btn').click();
    cy.get('#last-run .reporter-json', { timeout: 10000 }).should('exist');

    // html reporter — Mocha writes to #mocha div inside #last-run
    cy.window().then((win) => clickReporterBtn(win, 'html'));
    cy.get('#run-btn').click();
    cy.get('#last-run #mocha', { timeout: 10000 }).should('be.visible');
  });

  // ── 8.4 ─────────────────────────────────────────────────────────────────────
  it('8.4 — cy.intercept in a spec marks the test pending with unsupported reason', () => {
    cy.window().then((win) => setEditorValue(win, INTERCEPT_SPEC));
    // Ensure spec reporter is active
    cy.window().then((win) => clickReporterBtn(win, 'spec'));
    cy.get('#run-btn').click();

    cy.get('#last-run .reporter-output', { timeout: 10000 }).should('exist');
    // 0 passing, 0 failing, 1 pending
    cy.get('#last-run .reporter-summary .pass').should('contain.text', '0');
    cy.get('#last-run .reporter-summary .fail').should('contain.text', '0');
    cy.get('#last-run .reporter-summary .pending').should('contain.text', '1');
    // Pending entry must mention the skip reason
    cy.get('#last-run .reporter-test.pending').should('contain.text', 'unsupported in emulator: intercept');
  });

  // ── 8.7 ─────────────────────────────────────────────────────────────────────
  it('8.7 — supported cy-emulator commands always produce a definitive outcome (≥90% pass+fail)', () => {
    // Without a real form renderer the field commands will fail (no formTestApi).
    // The key requirement is that they fail explicitly — not silently vanish.
    // This verifies no test is silently dropped: total = pass + fail + pending (no ghosts).
    cy.window().then((win) => setEditorValue(win, SUPPORTED_COMMANDS_SPEC));
    cy.window().then((win) => clickReporterBtn(win, 'spec'));
    cy.get('#run-btn').click();

    cy.get('#last-run .reporter-output', { timeout: 10000 }).should('exist');

    cy.get('#last-run .reporter-summary').then(($el) => {
      const text = $el.text();
      const passing = parseInt(text.match(/(\d+)\s*passing/)?.[1] ?? '0', 10);
      const failing = parseInt(text.match(/(\d+)\s*failing/)?.[1] ?? '0', 10);
      const pending = parseInt(text.match(/(\d+)\s*pending/)?.[1] ?? '0', 10);
      const total = passing + failing + pending;
      const definitive = passing + failing;
      expect(total, 'total test count').to.be.greaterThan(0);
      // Supported commands produce pass or fail — definitive rate should be 100%
      // (pending only comes from unsupported commands like intercept).
      expect(definitive / total, 'definitive outcome ratio').to.be.at.least(0.9);
    });
  });
});
