import type {
	FillFieldOptions,
	FormTestApi,
	GetFieldValueOptions,
	VisibilityOptions
} from './form-test-api-types';

declare namespace Chai {
	interface Assertion {
		to: Assertion;
		be: Assertion;
		deep: Assertion;
		equal(expected: unknown): void;
		greaterThan(expected: number): void;
	}
}

declare const chai: {
	expect: (value: unknown, message?: string) => Chai.Assertion;
};

const POLL_INTERVAL_MS = 100;

export const FORM_READY_TIMEOUT_MS = 10_000;

export type CyEmulatorCommand = () => Promise<void> | void;

export interface QuantitySample {
	magnitude?: number;
	value?: number;
	unit?: string;
}

export interface AssertRangeSamplesOptions extends GetFieldValueOptions {
	path?: string;
	label?: string;
	min?: number | null;
	max?: number | null;
	minOp?: '>=' | '>';
	maxOp?: '<=' | '<';
	validSamples?: Array<number | QuantitySample>;
	invalidSamples?: Array<number | QuantitySample>;
	expectedUnit?: string | null;
}

export interface CyEmulator {
	fillField(path: string, value: unknown, opts?: FillFieldOptions): CyEmulator;
	expectVisible(path: string, opts?: VisibilityOptions): CyEmulator;
	expectHidden(path: string, opts?: VisibilityOptions): CyEmulator;
	expectValue(path: string, expected: unknown, opts?: GetFieldValueOptions): CyEmulator;
	assertRangeSamples(opts: AssertRangeSamplesOptions): CyEmulator;
	resetForm(): CyEmulator;
	formViewerReady(timeoutMs?: number): CyEmulator;
	waitForFormTestApi(timeoutMs?: number): CyEmulator;
	getSkipReason(): string | null;
	clearSkipReason(): void;
	runQueue(): Promise<void>;
	resetState(): void;
}

type FormTestApiHost = {
	formTestApi?: FormTestApi;
	closed?: boolean;
};

type BrowserWindowLike = {
	opener?: FormTestApiHost;
	__kintegrateFormViewerWindow?: FormTestApiHost;
	CyEmulatorModule?: {
		createCyEmulator: typeof createCyEmulator;
		getFormTestApi: typeof getFormTestApi;
		FORM_READY_TIMEOUT_MS: typeof FORM_READY_TIMEOUT_MS;
	};
	cy?: CyEmulator;
};

function getBrowserWindow(): BrowserWindowLike | undefined {
	return (globalThis as { window?: BrowserWindowLike }).window;
}

function resolveFormTestApiHost(): FormTestApi | null {
	const browserWindow = getBrowserWindow();
	const explicitViewerWindow = browserWindow?.__kintegrateFormViewerWindow;
	if (explicitViewerWindow && explicitViewerWindow.closed !== true && explicitViewerWindow.formTestApi) {
		return explicitViewerWindow.formTestApi;
	}

	const opener = browserWindow?.opener
		?? (globalThis as { opener?: FormTestApiHost }).opener;
	return opener?.formTestApi || null;
}

let formTestApiResolver = (): FormTestApi => {
	const api = resolveFormTestApiHost();
	if (!api) {
		throw new Error('Form viewer not open or formTestApi not available');
	}
	return api;
};

export function getFormTestApi(): FormTestApi {
	return formTestApiResolver();
}

export function setFormTestApiResolverForTests(resolver: () => FormTestApi): void {
	formTestApiResolver = resolver;
}

function waitFor(predicate: () => boolean, timeoutMs: number, timeoutMessage: string): Promise<void> {
	const startedAt = Date.now();

	return new Promise((resolve, reject) => {
		const poll = () => {
			try {
				if (predicate()) {
					resolve();
					return;
				}
			} catch (error) {
				reject(error);
				return;
			}

			if (Date.now() - startedAt >= timeoutMs) {
				reject(new Error(timeoutMessage));
				return;
			}

			setTimeout(poll, POLL_INTERVAL_MS);
		};

		poll();
	});
}

function getMagnitude(sample: number | QuantitySample): number | null {
	if (typeof sample === 'number') {
		return sample;
	}
	if (sample && typeof sample === 'object') {
		if (Number.isFinite(sample.magnitude)) {
			return sample.magnitude ?? null;
		}
		if (Number.isFinite(sample.value)) {
			return sample.value ?? null;
		}
	}
	return null;
}

function getUnit(sample: number | QuantitySample | unknown): string | null {
	if (sample && typeof sample === 'object' && 'unit' in sample) {
		const value = (sample as QuantitySample).unit;
		return typeof value === 'string' ? value : null;
	}
	return null;
}

function hasExpectedUnit(sample: number | QuantitySample | unknown, expectedUnit: string | null | undefined): boolean {
	if (!expectedUnit) {
		return true;
	}
	return getUnit(sample) === expectedUnit;
}

function isValidSample(
	sample: number | QuantitySample | unknown,
	min: number | null,
	max: number | null,
	minOp: '>=' | '>',
	maxOp: '<=' | '<',
	expectedUnit: string | null | undefined
): boolean {
	const magnitude = getMagnitude(sample as number | QuantitySample);
	if (!Number.isFinite(magnitude)) {
		return false;
	}
	const numericMagnitude = magnitude as number;
	if (!hasExpectedUnit(sample, expectedUnit)) {
		return false;
	}
	const minPass = min === null || (minOp === '>' ? numericMagnitude > min : numericMagnitude >= min);
	const maxPass = max === null || (maxOp === '<' ? numericMagnitude < max : numericMagnitude <= max);
	return minPass && maxPass;
}

export function createCyEmulator(): CyEmulator {
	let queue: Promise<void> = Promise.resolve();
	let skipReason: string | null = null;
	let proxy: CyEmulator;

	const enqueue = (fn: CyEmulatorCommand): CyEmulator => {
		queue = queue.then(async () => {
			if (skipReason) {
				return;
			}
			await fn();
		});
		return proxy;
	};

	const emulator: CyEmulator = {
		fillField(path: string, value: unknown, opts: FillFieldOptions = {}): CyEmulator {
			return enqueue(() => {
				getFormTestApi().setFieldValue(
					path,
					value,
					opts.multiIndex,
					opts.searchWithinContainerTag,
					opts.containerMultiIndex
				);
			});
		},

		expectVisible(path: string, opts: VisibilityOptions = {}): CyEmulator {
			return enqueue(() => {
				const hidden = getFormTestApi().isHidden(path, opts.searchWithinContainerTag, opts.containerMultiIndex);
				chai.expect(hidden, `${path} should be visible`).to.equal(false);
			});
		},

		expectHidden(path: string, opts: VisibilityOptions = {}): CyEmulator {
			return enqueue(() => {
				const hidden = getFormTestApi().isHidden(path, opts.searchWithinContainerTag, opts.containerMultiIndex);
				chai.expect(hidden, `${path} should be hidden`).to.equal(true);
			});
		},

		expectValue(path: string, expected: unknown, opts: GetFieldValueOptions = {}): CyEmulator {
			return enqueue(() => {
				const actual = getFormTestApi().getFieldValue(
					path,
					opts.multiIndex,
					opts.searchWithinContainerTag,
					opts.containerMultiIndex,
					opts.simpleValue
				);
				chai.expect(actual, `${path} value`).to.deep.equal(expected);
			});
		},

		assertRangeSamples(opts: AssertRangeSamplesOptions = {}): CyEmulator {
			const {
				path,
				label = 'range rule',
				min = null,
				max = null,
				minOp = '>=',
				maxOp = '<=',
				validSamples = [],
				invalidSamples = [],
				expectedUnit = null
			} = opts;

			return enqueue(() => {
				chai.expect(validSamples.length, `${label} generated valid samples`).to.be.greaterThan(0);
				validSamples.forEach((sample) => {
					let actual: unknown = sample;
					if (path) {
						getFormTestApi().setFieldValue(
							path,
							sample,
							opts.multiIndex,
							opts.searchWithinContainerTag,
							opts.containerMultiIndex
						);
						actual = getFormTestApi().getFieldValue(
							path,
							opts.multiIndex,
							opts.searchWithinContainerTag,
							opts.containerMultiIndex,
							opts.simpleValue
						);
					}
					chai.expect(
						isValidSample(actual, min, max, minOp, maxOp, expectedUnit),
						`${label} expected valid sample to pass`
					).to.equal(true);
					if (expectedUnit) {
						chai.expect(getUnit(actual), `${label} valid sample unit`).to.equal(expectedUnit);
					}
				});

				chai.expect(invalidSamples.length, `${label} generated invalid samples`).to.be.greaterThan(0);
				invalidSamples.forEach((sample) => {
					let actual: unknown = sample;
					if (path) {
						getFormTestApi().setFieldValue(
							path,
							sample,
							opts.multiIndex,
							opts.searchWithinContainerTag,
							opts.containerMultiIndex
						);
						actual = getFormTestApi().getFieldValue(
							path,
							opts.multiIndex,
							opts.searchWithinContainerTag,
							opts.containerMultiIndex,
							opts.simpleValue
						);
					}
					chai.expect(
						isValidSample(actual, min, max, minOp, maxOp, expectedUnit),
						`${label} expected invalid sample to fail`
					).to.equal(false);
				});
			});
		},

		resetForm(): CyEmulator {
			return enqueue(() => {
				getFormTestApi().resetForm();
			});
		},

		formViewerReady(timeoutMs = FORM_READY_TIMEOUT_MS): CyEmulator {
			return enqueue(async () => {
				await waitFor(
					() => getFormTestApi().isReady() === true,
					timeoutMs,
					`Form viewer not ready after ${timeoutMs}ms`
				);
			});
		},

		waitForFormTestApi(timeoutMs = FORM_READY_TIMEOUT_MS): CyEmulator {
			return enqueue(async () => {
				await waitFor(
					() => Boolean(resolveFormTestApiHost()),
					timeoutMs,
					`Form viewer not open or formTestApi not available after ${timeoutMs}ms`
				);
			});
		},

		getSkipReason(): string | null {
			return skipReason;
		},

		clearSkipReason(): void {
			skipReason = null;
		},

		runQueue(): Promise<void> {
			return queue;
		},

		resetState(): void {
			queue = Promise.resolve();
			skipReason = null;
		}
	};

	proxy = new Proxy(emulator, {
		get(target, prop, receiver) {
			if (prop in target) {
				return Reflect.get(target, prop, receiver);
			}
			return () => {
				skipReason = `unsupported in emulator: ${String(prop)}`;
				return proxy;
			};
		}
	}) as CyEmulator;

	return proxy;
}

const browserWindow = (globalThis as { window?: BrowserWindowLike }).window;
if (browserWindow) {
	browserWindow.CyEmulatorModule = {
		createCyEmulator,
		getFormTestApi,
		FORM_READY_TIMEOUT_MS
	};
}