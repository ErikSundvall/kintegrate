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

Cypress.Commands.add('resetForm', () => {
  cy.window().then((win) => {
    win.formTestApi.resetForm();
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

Cypress.Commands.add('assertRangeSamples', (options = {}) => {
  const {
    label = 'range rule',
    min = null,
    max = null,
    minOp = '>=',
    maxOp = '<=',
    validSamples = [],
    invalidSamples = [],
    expectedUnit = null
  } = options;

  const getMagnitude = (sample) => {
    if (typeof sample === 'number') {
      return sample;
    }
    if (sample && typeof sample === 'object') {
      if (Number.isFinite(sample.magnitude)) {
        return sample.magnitude;
      }
      if (Number.isFinite(sample.value)) {
        return sample.value;
      }
    }
    return null;
  };

  const getUnit = (sample) => {
    if (sample && typeof sample === 'object') {
      return sample.unit ?? null;
    }
    return null;
  };

  const hasExpectedUnit = (sample) => {
    if (!expectedUnit) {
      return true;
    }
    return getUnit(sample) === expectedUnit;
  };

  const isValid = (sample) => {
    const magnitude = getMagnitude(sample);
    if (!Number.isFinite(magnitude)) {
      return false;
    }
    if (!hasExpectedUnit(sample)) {
      return false;
    }
    const minPass = min === null || (minOp === '>' ? magnitude > min : magnitude >= min);
    const maxPass = max === null || (maxOp === '<' ? magnitude < max : magnitude <= max);
    return minPass && maxPass;
  };

  expect(validSamples.length, `${label} generated valid samples`).to.be.greaterThan(0);
  validSamples.forEach((sample) => {
    expect(isValid(sample), `${label} expected valid sample to pass`).to.equal(true);
    if (expectedUnit) {
      expect(getUnit(sample), `${label} valid sample unit`).to.equal(expectedUnit);
    }
  });

  expect(invalidSamples.length, `${label} generated invalid samples`).to.be.greaterThan(0);
  invalidSamples.forEach((sample) => {
    expect(isValid(sample), `${label} expected invalid sample to fail`).to.equal(false);
  });
});
