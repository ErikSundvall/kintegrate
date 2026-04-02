"use strict";
var CyEmulatorBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/ts/cy-emulator.ts
  var cy_emulator_exports = {};
  __export(cy_emulator_exports, {
    FORM_READY_TIMEOUT_MS: () => FORM_READY_TIMEOUT_MS,
    createCyEmulator: () => createCyEmulator,
    getFormTestApi: () => getFormTestApi,
    setFormTestApiResolverForTests: () => setFormTestApiResolverForTests
  });
  var POLL_INTERVAL_MS = 100;
  var FORM_READY_TIMEOUT_MS = 1e4;
  function getBrowserWindow() {
    return globalThis.window;
  }
  function resolveFormTestApiHost() {
    const browserWindow2 = getBrowserWindow();
    const explicitViewerWindow = browserWindow2?.__kintegrateFormViewerWindow;
    if (explicitViewerWindow && explicitViewerWindow.closed !== true && explicitViewerWindow.formTestApi) {
      return explicitViewerWindow.formTestApi;
    }
    const opener = browserWindow2?.opener ?? globalThis.opener;
    return opener?.formTestApi || null;
  }
  var formTestApiResolver = () => {
    const api = resolveFormTestApiHost();
    if (!api) {
      throw new Error("Form viewer not open or formTestApi not available");
    }
    return api;
  };
  function getFormTestApi() {
    return formTestApiResolver();
  }
  function setFormTestApiResolverForTests(resolver) {
    formTestApiResolver = resolver;
  }
  function waitFor(predicate, timeoutMs, timeoutMessage) {
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
  function getMagnitude(sample) {
    if (typeof sample === "number") {
      return sample;
    }
    if (sample && typeof sample === "object") {
      if (Number.isFinite(sample.magnitude)) {
        return sample.magnitude ?? null;
      }
      if (Number.isFinite(sample.value)) {
        return sample.value ?? null;
      }
    }
    return null;
  }
  function getUnit(sample) {
    if (sample && typeof sample === "object" && "unit" in sample) {
      const value = sample.unit;
      return typeof value === "string" ? value : null;
    }
    return null;
  }
  function hasExpectedUnit(sample, expectedUnit) {
    if (!expectedUnit) {
      return true;
    }
    return getUnit(sample) === expectedUnit;
  }
  function isValidSample(sample, min, max, minOp, maxOp, expectedUnit) {
    const magnitude = getMagnitude(sample);
    if (!Number.isFinite(magnitude)) {
      return false;
    }
    const numericMagnitude = magnitude;
    if (!hasExpectedUnit(sample, expectedUnit)) {
      return false;
    }
    const minPass = min === null || (minOp === ">" ? numericMagnitude > min : numericMagnitude >= min);
    const maxPass = max === null || (maxOp === "<" ? numericMagnitude < max : numericMagnitude <= max);
    return minPass && maxPass;
  }
  function createCyEmulator() {
    let queue = Promise.resolve();
    let skipReason = null;
    let proxy;
    const enqueue = (fn) => {
      queue = queue.then(async () => {
        if (skipReason) {
          return;
        }
        await fn();
      });
      return proxy;
    };
    const emulator = {
      fillField(path, value, opts = {}) {
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
      expectVisible(path, opts = {}) {
        return enqueue(() => {
          const hidden = getFormTestApi().isHidden(path, opts.searchWithinContainerTag, opts.containerMultiIndex);
          chai.expect(hidden, `${path} should be visible`).to.equal(false);
        });
      },
      expectHidden(path, opts = {}) {
        return enqueue(() => {
          const hidden = getFormTestApi().isHidden(path, opts.searchWithinContainerTag, opts.containerMultiIndex);
          chai.expect(hidden, `${path} should be hidden`).to.equal(true);
        });
      },
      expectValue(path, expected, opts = {}) {
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
      assertRangeSamples(opts = {}) {
        const {
          path,
          label = "range rule",
          min = null,
          max = null,
          minOp = ">=",
          maxOp = "<=",
          validSamples = [],
          invalidSamples = [],
          expectedUnit = null
        } = opts;
        return enqueue(() => {
          chai.expect(validSamples.length, `${label} generated valid samples`).to.be.greaterThan(0);
          validSamples.forEach((sample) => {
            let actual = sample;
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
            let actual = sample;
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
      resetForm() {
        return enqueue(() => {
          getFormTestApi().resetForm();
        });
      },
      formViewerReady(timeoutMs = FORM_READY_TIMEOUT_MS) {
        return enqueue(async () => {
          await waitFor(
            () => getFormTestApi().isReady() === true,
            timeoutMs,
            `Form viewer not ready after ${timeoutMs}ms`
          );
        });
      },
      waitForFormTestApi(timeoutMs = FORM_READY_TIMEOUT_MS) {
        return enqueue(async () => {
          await waitFor(
            () => Boolean(resolveFormTestApiHost()),
            timeoutMs,
            `Form viewer not open or formTestApi not available after ${timeoutMs}ms`
          );
        });
      },
      getSkipReason() {
        return skipReason;
      },
      clearSkipReason() {
        skipReason = null;
      },
      runQueue() {
        return queue;
      },
      resetState() {
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
    });
    return proxy;
  }
  var browserWindow = globalThis.window;
  if (browserWindow) {
    browserWindow.CyEmulatorModule = {
      createCyEmulator,
      getFormTestApi,
      FORM_READY_TIMEOUT_MS
    };
  }
  return __toCommonJS(cy_emulator_exports);
})();
//# sourceMappingURL=cy-emulator.browser.js.map
