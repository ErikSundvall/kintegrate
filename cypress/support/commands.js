Cypress.Commands.add('waitForFormTestApi', () => {
  cy.window({ timeout: 20000 }).should((win) => {
    if (!win.formTestApi) {
      throw new Error('formTestApi is not available. Open form-viewer with testMode=1.');
    }
  });
});

Cypress.Commands.add('formViewerReady', () => {
  cy.waitForFormTestApi();
  cy.window({ timeout: 20000 }).should((win) => {
    if (!win.formTestApi.isReady()) {
      throw new Error('Form renderer is not ready yet. Ensure a form package is loaded.');
    }
  });
});

Cypress.Commands.add('fillField', (tagOrPath, value, options = {}) => {
  cy.window().then((win) => {
    win.formTestApi.setFieldValue(
      tagOrPath,
      value,
      options.multiIndex,
      options.searchWithinContainerTag,
      options.containerMultiIndex
    );
  });
});

Cypress.Commands.add('expectVisible', (tagOrPath, options = {}) => {
  cy.window().then((win) => {
    const hidden = win.formTestApi.isHidden(
      tagOrPath,
      options.searchWithinContainerTag,
      options.containerMultiIndex
    );
    expect(hidden, `${tagOrPath} should be visible`).to.equal(false);
  });
});

Cypress.Commands.add('expectHidden', (tagOrPath, options = {}) => {
  cy.window().then((win) => {
    const hidden = win.formTestApi.isHidden(
      tagOrPath,
      options.searchWithinContainerTag,
      options.containerMultiIndex
    );
    expect(hidden, `${tagOrPath} should be hidden`).to.equal(true);
  });
});

Cypress.Commands.add('expectValue', (tagOrPath, expectedValue, options = {}) => {
  cy.window().then((win) => {
    const actualValue = win.formTestApi.getFieldValue(
      tagOrPath,
      options.multiIndex,
      options.searchWithinContainerTag,
      options.containerMultiIndex,
      options.simpleValue
    );
    expect(actualValue, `${tagOrPath} value`).to.deep.equal(expectedValue);
  });
});
