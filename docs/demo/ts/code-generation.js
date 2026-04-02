"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRangeSamples = buildRangeSamples;
exports.normalizeScopeLevels = normalizeScopeLevels;
exports.buildGeneratedGroups = buildGeneratedGroups;
exports.wrapDescribeSection = wrapDescribeSection;
exports.serializeTestCase = serializeTestCase;
exports.buildDependencySpec = buildDependencySpec;
const test_title_utils_1 = require("./test-title-utils");
function uniqueValues(values) {
    return [...new Set(values.filter((value) => Boolean(value)))];
}
function toFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function optionNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function pickIdentifier(rule, type) {
    const pathKey = `${type}Path`;
    const tagKey = `${type}Tag`;
    return rule[pathKey] || rule[tagKey] || null;
}
function humanizeFieldName(value) {
    const raw = String(value || 'field').trim();
    const segments = raw.split('/').filter(Boolean);
    const leaf = segments[segments.length - 1] || raw;
    return (0, test_title_utils_1.sanitizeTestTitle)(leaf.replace(/_/g, '-')) || 'field';
}
function humanizeValue(value) {
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (value === null || value === undefined) {
        return 'empty';
    }
    return (0, test_title_utils_1.sanitizeTestTitle)(String(value)) || 'value';
}
function buildVisibilityTitle(rule, trigger, target) {
    const verb = rule.actionName === 'hide' ? 'hides' : 'shows';
    const triggerValue = rule.triggerValue ?? rule.showValue;
    return `${verb} ${humanizeFieldName(target)} when ${humanizeFieldName(trigger)} is ${humanizeValue(triggerValue)}`;
}
function buildRangeTitle(rule) {
    const fieldName = humanizeFieldName(rule.field || rule.fieldPath || 'field');
    const min = toFiniteNumber(rule.min);
    const max = toFiniteNumber(rule.max);
    if (min !== null && max !== null) {
        return `validates ${fieldName} is between ${min} and ${max}`;
    }
    if (min !== null) {
        return `validates ${fieldName} is ${normalizeOperator(rule.minOp, 'min')} ${min}`;
    }
    if (max !== null) {
        return `validates ${fieldName} is ${normalizeOperator(rule.maxOp, 'max')} ${max}`;
    }
    return `validates ${fieldName}`;
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
    return String(op);
}
function isExclusive(op) {
    return op === '>' || op === '<';
}
function pickStep(min, max) {
    if (min !== null && max !== null && Number.isInteger(min) && Number.isInteger(max)) {
        const delta = Math.abs(max - min);
        return delta >= 2 ? 1 : 0.5;
    }
    return 0.1;
}
function buildRangeSamples(rule, richness = 'rich') {
    const min = toFiniteNumber(rule.min);
    const max = toFiniteNumber(rule.max);
    const minOp = normalizeOperator(rule.minOp, 'min');
    const maxOp = normalizeOperator(rule.maxOp, 'max');
    const step = pickStep(min, max);
    const validSamples = [];
    const invalidSamples = [];
    if (min !== null && max !== null) {
        const lower = isExclusive(minOp) ? min + step : min;
        const upper = isExclusive(maxOp) ? max - step : max;
        if (lower <= upper) {
            validSamples.push(lower);
            if (richness === 'rich') {
                if (upper !== lower) {
                    validSamples.push(upper);
                }
                const middle = (lower + upper) / 2;
                if (!validSamples.includes(middle)) {
                    validSamples.push(middle);
                }
            }
        }
        invalidSamples.push(isExclusive(minOp) ? min : min - step);
        if (richness === 'rich') {
            invalidSamples.push(isExclusive(maxOp) ? max : max + step);
        }
    }
    else if (min !== null) {
        validSamples.push(isExclusive(minOp) ? min + step : min);
        invalidSamples.push(isExclusive(minOp) ? min : min - step);
        if (richness === 'rich') {
            validSamples.push((isExclusive(minOp) ? min + step : min) + step);
        }
    }
    else if (max !== null) {
        validSamples.push(isExclusive(maxOp) ? max - step : max);
        invalidSamples.push(isExclusive(maxOp) ? max : max + step);
        if (richness === 'rich') {
            validSamples.push((isExclusive(maxOp) ? max - step : max) - step);
        }
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
    return values.map((magnitude) => ({ magnitude, unit }));
}
function buildRangeAssertionPayload(rule, samples) {
    const expectedUnit = rule.rmType === 'DV_QUANTITY' && rule.unit ? rule.unit : null;
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
function buildDependencyTests(parsedForm, level) {
    if (level <= 0) {
        return [];
    }
    return (parsedForm.dependencies || [])
        .filter((rule) => level >= 2 || rule.actionName === 'show')
        .map((rule, index) => {
        const trigger = pickIdentifier(rule, 'trigger');
        const target = pickIdentifier(rule, 'target');
        if (!trigger || !target) {
            const missing = [!trigger ? 'trigger' : null, !target ? 'target' : null].filter(Boolean).join(' and ');
            const body = `throw new Error('Generator could not resolve ${missing} identifier for dependency rule ${index + 1}.');`;
            return {
                title: `dependency rule ${index + 1} has unresolved field identifiers`,
                callType: 'it',
                actions: [body],
                body
            };
        }
        const baseName = buildVisibilityTitle(rule, trigger, target);
        const actions = [
            `cy.fillField(${(0, test_title_utils_1.asLiteral)(trigger)}, ${(0, test_title_utils_1.asLiteral)(rule.hideValue)});`,
            `cy.expectHidden(${(0, test_title_utils_1.asLiteral)(target)});`,
            `cy.fillField(${(0, test_title_utils_1.asLiteral)(trigger)}, ${(0, test_title_utils_1.asLiteral)(rule.showValue)});`,
            `cy.expectVisible(${(0, test_title_utils_1.asLiteral)(target)});`
        ];
        return {
            title: baseName,
            callType: 'it',
            actions,
            body: actions.join('\n')
        };
    });
}
function buildCalculationTests(parsedForm, level) {
    if (level <= 0) {
        return [];
    }
    return (parsedForm.calculations || []).map((rule, index) => {
        const actions = [
            `const field = ${(0, test_title_utils_1.asLiteral)(rule.field || null)};`,
            `const expression = ${(0, test_title_utils_1.asLiteral)(rule.expression || '')};`,
            '',
            "expect(field).to.be.a('string').and.not.to.equal('');",
            "expect(expression).to.be.a('string');",
            'expect(expression.trim().length).to.be.greaterThan(0);'
        ];
        return {
            title: rule.field ? `captures calculation metadata for ${humanizeFieldName(rule.field)}` : `captures calculation metadata for rule ${index + 1}`,
            callType: 'it',
            actions,
            body: actions.join('\n')
        };
    });
}
function buildRangeValidationTests(parsedForm, level) {
    if (level <= 0) {
        return [];
    }
    const richness = level >= 2 ? 'rich' : 'baseline';
    return (parsedForm.validations || []).map((rule, index) => {
        const samples = buildRangeSamples(rule, richness);
        const assertionPayload = buildRangeAssertionPayload(rule, samples);
        const action = `cy.assertRangeSamples(${(0, test_title_utils_1.asLiteral)({
            label: `validation ${rule.field || 'field'} #${index + 1}`,
            min: assertionPayload.min,
            max: assertionPayload.max,
            minOp: assertionPayload.minOp,
            maxOp: assertionPayload.maxOp,
            validSamples: assertionPayload.validSamples,
            invalidSamples: assertionPayload.invalidSamples,
            expectedUnit: assertionPayload.expectedUnit
        })});`;
        return {
            title: buildRangeTitle(rule),
            callType: 'it',
            actions: [action],
            body: action
        };
    });
}
function buildValueRangeMetadataTests(parsedForm, levels) {
    if (levels.ranges <= 0) {
        return [];
    }
    if (levels.ranges === 1 && levels.validation > 0) {
        return [];
    }
    if (levels.ranges < 2) {
        return [];
    }
    return (parsedForm.valueRanges || []).map((rule, index) => {
        const samples = buildRangeSamples(rule, 'rich');
        const assertionPayload = buildRangeAssertionPayload(rule, samples);
        const action = `cy.assertRangeSamples(${(0, test_title_utils_1.asLiteral)({
            label: `value range ${rule.field || 'field'} #${index + 1}`,
            min: assertionPayload.min,
            max: assertionPayload.max,
            minOp: assertionPayload.minOp,
            maxOp: assertionPayload.maxOp,
            validSamples: assertionPayload.validSamples,
            invalidSamples: assertionPayload.invalidSamples,
            expectedUnit: assertionPayload.expectedUnit
        })});`;
        return {
            title: buildRangeTitle(rule),
            callType: 'it',
            actions: [action],
            body: action
        };
    });
}
function buildRequiredFieldTests(parsedForm, level) {
    if (level <= 0) {
        return [];
    }
    return (parsedForm.requiredFields || []).map((rule, index) => {
        const min = toFiniteNumber(rule.min) ?? 1;
        const actions = [
            `const min = ${(0, test_title_utils_1.asLiteral)(min)};`,
            '',
            'const hasRequiredCardinality = (value) => {',
            '  if (value === null || value === undefined) {',
            '    return false;',
            '  }',
            '  if (Array.isArray(value)) {',
            '    return value.length >= min;',
            '  }',
            "  if (typeof value === 'string') {",
            '    return value.length >= min;',
            '  }',
            '  return min <= 1;',
            '};',
            '',
            'expect(hasRequiredCardinality(null)).to.equal(false);',
            'expect(hasRequiredCardinality(undefined)).to.equal(false);'
        ];
        if (level >= 2) {
            if (min > 1) {
                actions.push('', `const tooShort = Array.from({ length: ${Math.max(min - 1, 0)} }, () => 'x');`, `const enough = Array.from({ length: ${min} }, () => 'x');`, 'expect(hasRequiredCardinality(tooShort)).to.equal(false);', 'expect(hasRequiredCardinality(enough)).to.equal(true);', `expect(hasRequiredCardinality('x'.repeat(${Math.max(min - 1, 0)}))).to.equal(false);`, `expect(hasRequiredCardinality('x'.repeat(${min}))).to.equal(true);`);
            }
            else {
                actions.push('', "expect(hasRequiredCardinality('x')).to.equal(true);", 'expect(hasRequiredCardinality([1])).to.equal(true);', 'expect(hasRequiredCardinality(1)).to.equal(true);', "expect(hasRequiredCardinality('')).to.equal(false);", 'expect(hasRequiredCardinality([])).to.equal(false);');
            }
        }
        else if (min > 1) {
            actions.push('', `expect(hasRequiredCardinality(Array.from({ length: ${Math.max(min - 1, 0)} }, () => 'x'))).to.equal(false);`, `expect(hasRequiredCardinality(Array.from({ length: ${min} }, () => 'x'))).to.equal(true);`);
        }
        else {
            actions.push('', 'expect(hasRequiredCardinality([1])).to.equal(true);', 'expect(hasRequiredCardinality([])).to.equal(false);');
        }
        return {
            title: `requires ${humanizeFieldName(rule.field || rule.fieldPath || `field ${index + 1}`)}`,
            callType: 'it',
            actions,
            body: actions.join('\n')
        };
    });
}
function filterParsedFormByRuleIds(parsedForm, enabledRuleIds) {
    if (!(enabledRuleIds instanceof Set)) {
        return parsedForm;
    }
    return {
        ...parsedForm,
        dependencies: (parsedForm.dependencies || []).filter((_rule, index) => enabledRuleIds.has(`logic::${index}`)),
        calculations: (parsedForm.calculations || []).filter((_rule, index) => enabledRuleIds.has(`calc::${index}`)),
        validations: (parsedForm.validations || []).filter((_rule, index) => enabledRuleIds.has(`validation::${index}`)),
        valueRanges: (parsedForm.valueRanges || []).filter((_rule, index) => enabledRuleIds.has(`ranges::${index}`)),
        requiredFields: (parsedForm.requiredFields || []).filter((_rule, index) => enabledRuleIds.has(`required::${index}`))
    };
}
function normalizeScopeLevels(options = {}) {
    const selectedCategories = (0, test_title_utils_1.normalizeCategories)(options.categories);
    const explicitLevels = {
        logic: optionNumber(options.logicLevel),
        calc: optionNumber(options.calcLevel),
        validation: optionNumber(options.validationLevel),
        ranges: optionNumber(options.rangesLevel),
        required: optionNumber(options.requiredLevel)
    };
    const hasExplicitLevels = Object.values(explicitLevels).some((value) => value !== null);
    const levels = {};
    test_title_utils_1.ALL_CATEGORIES.forEach((category) => {
        if (explicitLevels[category] !== null) {
            levels[category] = explicitLevels[category];
            return;
        }
        if (selectedCategories.length) {
            levels[category] = selectedCategories.includes(category) ? 1 : 0;
            return;
        }
        levels[category] = hasExplicitLevels ? 0 : 1;
    });
    return levels;
}
function buildGeneratedGroups(parsedForm, options = {}) {
    const levels = normalizeScopeLevels(options);
    const enabledRuleIds = options.enabledRuleIds instanceof Set ? options.enabledRuleIds : null;
    const filteredParsed = filterParsedFormByRuleIds(parsedForm, enabledRuleIds);
    const groups = [];
    const logicTests = buildDependencyTests(filteredParsed, levels.logic);
    if (logicTests.length) {
        groups.push({ name: 'logic', tests: logicTests, extrasText: '' });
    }
    const calcTests = buildCalculationTests(filteredParsed, levels.calc);
    if (calcTests.length) {
        groups.push({ name: 'calc', tests: calcTests, extrasText: '' });
    }
    const validationTests = buildRangeValidationTests(filteredParsed, levels.validation);
    if (validationTests.length) {
        groups.push({ name: 'validation', tests: validationTests, extrasText: '' });
    }
    const manualRangeCases = Array.isArray(options.manualRangeCases) ? options.manualRangeCases : [];
    const rangeTests = [
        ...buildValueRangeMetadataTests(filteredParsed, levels),
        ...(levels.ranges > 0 ? manualRangeCases : [])
    ];
    if (rangeTests.length) {
        groups.push({ name: 'ranges', tests: rangeTests, extrasText: '' });
    }
    const requiredTests = buildRequiredFieldTests(filteredParsed, levels.required);
    if (requiredTests.length) {
        groups.push({ name: 'required', tests: requiredTests, extrasText: '' });
    }
    return groups;
}
function wrapDescribeSection(name, body) {
    const setupLines = [
        '    before(() => { cy.formViewerReady(); });',
        '',
        '    beforeEach(() => { cy.resetForm(); });'
    ].join('\n');
    if (!body) {
        return `  describe(${(0, test_title_utils_1.quoteSingle)(name)}, () => {\n${setupLines}\n  });`;
    }
    return `  describe(${(0, test_title_utils_1.quoteSingle)(name)}, () => {\n${setupLines}\n\n${body}\n  });`;
}
function serializeTestCase(test) {
    const sourceBody = typeof test.body === 'string' ? test.body : (test.actions || []).join('\n');
    const body = String(sourceBody || '').trimEnd();
    const bodyBlock = body
        ? `\n${body.split('\n').map((line) => (line ? `      ${line}` : '')).join('\n')}\n`
        : '\n';
    return `    ${(test.callType || 'it')}(${(0, test_title_utils_1.quoteSingle)(test.title || 'unnamed test')}, () => {${bodyBlock}    });`;
}
function buildDependencySpec(parsedForm, options = {}) {
    const groups = buildGeneratedGroups(parsedForm, options);
    const suiteName = (0, test_title_utils_1.sanitizeTestTitle)(parsedForm.name || 'Generated logic tests');
    const testBlocks = groups
        .map((group) => wrapDescribeSection(group.name, (group.tests || []).map((test) => serializeTestCase(test)).join('\n\n')))
        .join('\n\n');
    return `describe(${(0, test_title_utils_1.quoteSingle)(`${suiteName} - autogenerated form tests`)}, () => {\n${testBlocks}\n});\n`;
}
