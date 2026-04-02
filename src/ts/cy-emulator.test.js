const test = require('node:test');
const assert = require('node:assert/strict');

global.chai = {
	expect(value, message) {
		const chain = {
			equal(expected) {
				assert.deepEqual(value, expected, message);
			},
			greaterThan(expected) {
				assert.ok(value > expected, message);
			}
		};
		chain.to = chain;
		chain.be = chain;
		chain.deep = chain;
		return chain;
	}
};

const { createCyEmulator } = require('./cy-emulator.js');

function createMockApi() {
	const calls = [];
	let currentValue = null;
	let hidden = false;
	let ready = true;
	let resetCount = 0;

	return {
		calls,
		setHidden(nextHidden) {
			hidden = nextHidden;
		},
		setReady(nextReady) {
			ready = nextReady;
		},
		setFieldValue(path, value, multiIndex, searchWithinContainerTag, containerMultiIndex) {
			calls.push(['setFieldValue', path, value, multiIndex, searchWithinContainerTag, containerMultiIndex]);
			currentValue = value;
		},
		getFieldValue(path, multiIndex, searchWithinContainerTag, containerMultiIndex, simpleValue) {
			calls.push(['getFieldValue', path, multiIndex, searchWithinContainerTag, containerMultiIndex, simpleValue]);
			return currentValue;
		},
		isHidden(path, searchWithinContainerTag, containerMultiIndex) {
			calls.push(['isHidden', path, searchWithinContainerTag, containerMultiIndex]);
			return hidden;
		},
		isReady() {
			calls.push(['isReady']);
			return ready;
		},
		resetForm() {
			calls.push(['resetForm']);
			resetCount += 1;
			currentValue = null;
		},
		get resetCount() {
			return resetCount;
		}
	};
}

test.beforeEach(() => {
	delete global.window;
});

test('fillField calls setFieldValue with the correct path and value', async () => {
	const mockApi = createMockApi();
	global.window = { opener: { formTestApi: mockApi } };
	const cy = createCyEmulator();

	cy.fillField('/pulse', 72);
	await cy.runQueue();

	assert.deepEqual(mockApi.calls[0], ['setFieldValue', '/pulse', 72, undefined, undefined, undefined]);
});

test('expectVisible passes when the field is not hidden', async () => {
	const mockApi = createMockApi();
	global.window = { opener: { formTestApi: mockApi } };
	const cy = createCyEmulator();

	cy.expectVisible('/pulse');
	await assert.doesNotReject(cy.runQueue());
});

test('expectHidden fails when the field is visible', async () => {
	const mockApi = createMockApi();
	global.window = { opener: { formTestApi: mockApi } };
	const cy = createCyEmulator();

	cy.expectHidden('/pulse');
	await assert.rejects(cy.runQueue(), /should be hidden/);
});

test('expectValue passes when the field value matches', async () => {
	const mockApi = createMockApi();
	mockApi.setFieldValue('/pulse', { systolic: 120 });
	mockApi.calls.length = 0;
	global.window = { opener: { formTestApi: mockApi } };
	const cy = createCyEmulator();

	cy.expectValue('/pulse', { systolic: 120 });
	await assert.doesNotReject(cy.runQueue());
});

test('resetForm calls formTestApi.resetForm', async () => {
	const mockApi = createMockApi();
	global.window = { opener: { formTestApi: mockApi } };
	const cy = createCyEmulator();

	cy.resetForm();
	await cy.runQueue();

	assert.equal(mockApi.resetCount, 1);
	assert.deepEqual(mockApi.calls[0], ['resetForm']);
});

test('assertRangeSamples sets and re-reads samples when a path is provided', async () => {
	const mockApi = createMockApi();
	global.window = { opener: { formTestApi: mockApi } };
	const cy = createCyEmulator();

	cy.assertRangeSamples({
		path: '/temperature',
		label: 'temperature range',
		min: 36,
		max: 38,
		validSamples: [36, 37, 38],
		invalidSamples: [35, 39]
	});
	await assert.doesNotReject(cy.runQueue());

	assert.equal(
		mockApi.calls.filter((call) => call[0] === 'setFieldValue').length,
		5
	);
	assert.equal(
		mockApi.calls.filter((call) => call[0] === 'getFieldValue').length,
		5
	);
});

test('unsupported commands set a skip reason and do not throw', async () => {
	const mockApi = createMockApi();
	global.window = { opener: { formTestApi: mockApi } };
	const cy = createCyEmulator();

	cy.intercept('GET', '/foo', {});

	assert.equal(cy.getSkipReason(), 'unsupported in emulator: intercept');
	await assert.doesNotReject(cy.runQueue());
});

test('prefers an explicitly registered viewer window over opener for formTestApi', async () => {
	const openerApi = createMockApi();
	const viewerApi = createMockApi();
	global.window = {
		opener: { formTestApi: openerApi },
		__kintegrateFormViewerWindow: { formTestApi: viewerApi, closed: false }
	};
	const cy = createCyEmulator();

	cy.fillField('/pulse', 72);
	await cy.runQueue();

	assert.deepEqual(viewerApi.calls[0], ['setFieldValue', '/pulse', 72, undefined, undefined, undefined]);
	assert.equal(openerApi.calls.length, 0);
});