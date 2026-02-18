function sanitizeTestTitle(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/['`]/g, '')
    .trim();
}

function asLiteral(value) {
  return JSON.stringify(value);
}

function pickIdentifier(rule, type) {
  const pathKey = `${type}Path`;
  const tagKey = `${type}Tag`;
  return rule[pathKey] || rule[tagKey] || null;
}

function ruleFieldLabel(rule) {
  const suffixPart = rule?.suffix ? ` (${rule.suffix})` : '';
  return `${rule?.field || 'field'}${suffixPart}`;
}

function normalizeOperator(op, bound) {
  if (!op) {
    return bound === 'min' ? '>=' : '<=';
  }
  const normalized = String(op).trim().toLowerCase();
  if (normalized === 'ge' || normalized === 'gte') {
    return '>=';
  }
  if (normalized === 'le' || normalized === 'lte') {
    return '<=';
  }
  if (normalized === 'gt') {
    return '>';
  }
  if (normalized === 'lt') {
    return '<';
  }
  return op;
}

function isExclusive(op) {
  return op === '>' || op === '<';
}

function pickStep(min, max) {
  const finiteMin = Number.isFinite(min);
  const finiteMax = Number.isFinite(max);
  if (finiteMin && finiteMax && Number.isInteger(min) && Number.isInteger(max)) {
    const delta = Math.abs(max - min);
    return delta >= 2 ? 1 : 0.5;
  }
  return 0.1;
}

function buildRangeSamples(rule) {
  const min = Number.isFinite(rule?.min) ? rule.min : null;
  const max = Number.isFinite(rule?.max) ? rule.max : null;
  const minOp = normalizeOperator(rule?.minOp, 'min');
  const maxOp = normalizeOperator(rule?.maxOp, 'max');
  const step = pickStep(min, max);

  const validSamples = [];
  const invalidSamples = [];

  if (min !== null && max !== null) {
    const lower = isExclusive(minOp) ? min + step : min;
    const upper = isExclusive(maxOp) ? max - step : max;
    if (lower <= upper) {
      validSamples.push(lower);
      if (upper !== lower) {
        validSamples.push(upper);
      }
      const middle = (lower + upper) / 2;
      if (!validSamples.includes(middle)) {
        validSamples.push(middle);
      }
    }
  } else if (min !== null) {
    validSamples.push(isExclusive(minOp) ? min + step : min);
  } else if (max !== null) {
    validSamples.push(isExclusive(maxOp) ? max - step : max);
  }

  if (min !== null) {
    invalidSamples.push(isExclusive(minOp) ? min : min - step);
  }
  if (max !== null) {
    invalidSamples.push(isExclusive(maxOp) ? max : max + step);
  }

  return {
    min,
    max,
    minOp,
    maxOp,
    validSamples: [...new Set(validSamples.filter((value) => Number.isFinite(value)))],
    invalidSamples: [...new Set(invalidSamples.filter((value) => Number.isFinite(value)))]
  };
}

function toQuantitySamples(values, unit) {
  return (values || []).map((magnitude) => ({ magnitude, unit }));
}

function buildRangeAssertionPayload(rule, samples) {
  const expectedUnit = rule?.rmType === 'DV_QUANTITY' && rule?.unit ? rule.unit : null;

  const validSamples = expectedUnit
    ? toQuantitySamples(samples.validSamples, expectedUnit)
    : samples.validSamples;

  const invalidSamples = expectedUnit
    ? [
        ...toQuantitySamples(samples.invalidSamples, expectedUnit),
        ...(samples.validSamples.length
          ? [{ magnitude: samples.validSamples[0], unit: `${expectedUnit}__INVALID` }]
          : [])
      ]
    : samples.invalidSamples;

  return {
    min: samples.min,
    max: samples.max,
    minOp: samples.minOp,
    maxOp: samples.maxOp,
    validSamples,
    invalidSamples,
    expectedUnit
  };
}

const CATEGORY_ALIASES = {
  logic: 'logic',
  dependencies: 'logic',
  'form-logic': 'logic',
  calculations: 'calculations',
  validations: 'validations',
  'required-fields': 'requiredFields',
  required: 'requiredFields',
  valueRanges: 'valueRanges',
  'value-ranges': 'valueRanges'
};

function normalizeCategories(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return ['logic'];
  }
  return [...new Set(categories.map((item) => CATEGORY_ALIASES[item] || item).filter(Boolean))];
}

function buildDependencyTests(parsedForm) {
  const dependencies = parsedForm.dependencies || [];

  return dependencies
    .map((rule, index) => {
      const trigger = pickIdentifier(rule, 'trigger');
      const target = pickIdentifier(rule, 'target');

      if (!trigger || !target) {
        const missing = [!trigger ? 'trigger' : null, !target ? 'target' : null].filter(Boolean).join(' and ');
        return `  it('dependency rule ${index + 1} has unresolved field identifiers', () => {\n    throw new Error('Generator could not resolve ${missing} identifier for dependency rule ${index + 1}.');\n  });`;
      }

      const name =
        sanitizeTestTitle(rule.description) ||
        `${target} visibility toggles from ${trigger}`;

      return `  it('${name}', () => {\n    cy.visit('/form-viewer.html#testMode=1&autoLoad=1');\n    cy.formViewerReady();\n\n    cy.fillField(${asLiteral(trigger)}, ${asLiteral(rule.hideValue)});\n    cy.expectHidden(${asLiteral(target)});\n\n    cy.fillField(${asLiteral(trigger)}, ${asLiteral(rule.showValue)});\n    cy.expectVisible(${asLiteral(target)});\n  });`;
    })
    .join('\n\n');
}

function buildCalculationTests(parsedForm) {
  return (parsedForm.calculations || [])
    .map((rule, index) => {
      const title = sanitizeTestTitle(
        rule?.field
          ? `calculation metadata exists for ${rule.field}`
          : `calculation rule ${index + 1} has metadata`
      );
      return `  it('${title}', () => {\n    const field = ${asLiteral(rule?.field || null)};\n    const expression = ${asLiteral(rule?.expression || '')};\n\n    expect(field).to.be.a('string').and.not.to.equal('');\n    expect(expression).to.be.a('string');\n    expect(expression.trim().length).to.be.greaterThan(0);\n  });`;
    })
    .join('\n\n');
}

function buildRangeValidationTests(parsedForm) {
  const rules = parsedForm.validations || [];
  return rules
    .map((rule, index) => {
      const samples = buildRangeSamples(rule);
      const assertionPayload = buildRangeAssertionPayload(rule, samples);
      const limits = [
        samples.min !== null ? `min ${samples.minOp} ${samples.min}` : null,
        samples.max !== null ? `max ${samples.maxOp} ${samples.max}` : null
      ]
        .filter(Boolean)
        .join(', ');
      const unitText = assertionPayload.expectedUnit ? `, unit ${assertionPayload.expectedUnit}` : '';

      const title = sanitizeTestTitle(
        `${ruleFieldLabel(rule)} range rule ${index + 1} accepts valid values and rejects invalid values (${limits || 'unbounded'}${unitText})`
      );

      return `  it('${title}', () => {\n    cy.assertRangeSamples(${asLiteral({
        label: title,
        min: assertionPayload.min,
        max: assertionPayload.max,
        minOp: assertionPayload.minOp,
        maxOp: assertionPayload.maxOp,
        validSamples: assertionPayload.validSamples,
        invalidSamples: assertionPayload.invalidSamples,
        expectedUnit: assertionPayload.expectedUnit
      })});\n  });`;
    })
    .join('\n\n');
}

function buildValueRangeMetadataTests(parsedForm) {
  const rules = parsedForm.valueRanges || [];
  return rules
    .map((rule, index) => {
      const minOp = normalizeOperator(rule?.minOp, 'min');
      const maxOp = normalizeOperator(rule?.maxOp, 'max');
      const title = sanitizeTestTitle(
        `${ruleFieldLabel(rule)} declares value range metadata ${index + 1}`
      );
      return `  it('${title}', () => {\n    const rule = ${asLiteral({
      field: rule?.field || null,
      suffix: rule?.suffix || null,
      min: Number.isFinite(rule?.min) ? rule.min : null,
      max: Number.isFinite(rule?.max) ? rule.max : null,
      minOp,
      maxOp
    })};\n\n    expect(rule.field).to.be.a('string').and.not.to.equal('');\n    expect(rule.min !== null || rule.max !== null).to.equal(true);\n    if (rule.min !== null) {\n      expect(rule.minOp === '>' || rule.minOp === '>=').to.equal(true);\n    }\n    if (rule.max !== null) {\n      expect(rule.maxOp === '<' || rule.maxOp === '<=').to.equal(true);\n    }\n  });`;
    })
    .join('\n\n');
}

function buildRequiredFieldTests(parsedForm) {
  const rules = parsedForm.requiredFields || [];
  return (rules || [])
    .map((rule, index) => {
      const min = Number.isFinite(rule?.min) ? rule.min : 1;
      const title = sanitizeTestTitle(
        `${rule?.field || 'field'} required cardinality enforces min ${min}`
      ) || `required field rule ${index + 1}`;

      return `  it('${title}', () => {\n    const min = ${asLiteral(min)};\n\n    const hasRequiredCardinality = (value) => {\n      if (value === null || value === undefined) {\n        return false;\n      }\n      if (Array.isArray(value)) {\n        return value.length >= min;\n      }\n      if (typeof value === 'string') {\n        return value.length >= min;\n      }\n      return min <= 1;\n    };\n\n    expect(hasRequiredCardinality(null)).to.equal(false);\n    expect(hasRequiredCardinality(undefined)).to.equal(false);\n\n    if (min > 1) {\n      const tooShort = Array.from({ length: min - 1 }, () => 'x');\n      const enough = Array.from({ length: min }, () => 'x');\n      expect(hasRequiredCardinality(tooShort)).to.equal(false);\n      expect(hasRequiredCardinality(enough)).to.equal(true);\n      expect(hasRequiredCardinality('x'.repeat(min - 1))).to.equal(false);\n      expect(hasRequiredCardinality('x'.repeat(min))).to.equal(true);\n      expect(hasRequiredCardinality(1)).to.equal(false);\n    } else {\n      expect(hasRequiredCardinality('x')).to.equal(true);\n      expect(hasRequiredCardinality([1])).to.equal(true);\n      expect(hasRequiredCardinality(1)).to.equal(true);\n      expect(hasRequiredCardinality('')).to.equal(false);\n      expect(hasRequiredCardinality([])).to.equal(false);\n    }\n  });`;
    })
    .join('\n\n');
}

function buildDependencySpec(parsedForm, options = {}) {
  const suiteName = sanitizeTestTitle(parsedForm.name || 'Generated logic tests');
  const selected = normalizeCategories(options.categories);
  const sections = [];

  if (selected.includes('logic')) {
    sections.push(buildDependencyTests(parsedForm));
  }

  if (selected.includes('calculations')) {
    sections.push(buildCalculationTests(parsedForm));
  }

  const includeValidations = selected.includes('validations');
  const includeValueRanges = selected.includes('valueRanges');

  if (includeValidations) {
    sections.push(buildRangeValidationTests(parsedForm));
  }

  if (includeValueRanges && !includeValidations) {
    sections.push(buildValueRangeMetadataTests(parsedForm));
  }

  if (selected.includes('requiredFields')) {
    sections.push(buildRequiredFieldTests(parsedForm));
  }

  const testBlocks = sections.filter(Boolean).join('\n\n');
  const fallback = "  it('no rules discovered for selected categories', () => {\n    cy.log('No rules were discovered in this form definition for the selected categories.');\n  });";

  return `describe('${suiteName} - autogenerated form tests', () => {\n${testBlocks || fallback}\n});\n`;
}

module.exports = {
  buildDependencySpec
};
