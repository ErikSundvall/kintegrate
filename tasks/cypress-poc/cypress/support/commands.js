Cypress.Commands.add('waitForFormTestApi', () => {
  cy.window({ timeout: 20000 }).should((win) => {
    if (!win.formTestApi) {
      throw new Error('formTestApi is not available. Load a form in the viewer with testMode=1.');
    }
  });
});

Cypress.Commands.add('waitForFormReady', () => {
  cy.window({ timeout: 20000 }).should((win) => {
    if (!win.formTestApi || !win.formTestApi.isReady()) {
      throw new Error('Form renderer is not ready yet. Ensure a form is loaded.');
    }
  });
});

Cypress.Commands.add('setFieldValue', (tagOrPath, value, options = {}) => {
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

Cypress.Commands.add('getFieldValue', (tagOrPath, options = {}) => {
  return cy.window().then((win) =>
    win.formTestApi.getFieldValue(
      tagOrPath,
      options.multiIndex,
      options.searchWithinContainerTag,
      options.containerMultiIndex,
      options.simpleValue
    )
  );
});

Cypress.Commands.add('isHidden', (tagOrPath, options = {}) => {
  return cy.window().then((win) =>
    win.formTestApi.isHidden(
      tagOrPath,
      options.searchWithinContainerTag,
      options.containerMultiIndex
    )
  );
});
