const core = require('../src/test-generation-core.js');

module.exports = {
  buildDependencySpec: core.buildDependencySpec,
  buildGeneratedGroups: core.buildGeneratedGroups,
  buildDiscoveredRuleRows: core.buildDiscoveredRuleRows,
  filterParsedFormByRuleIds: core.filterParsedFormByRuleIds,
  normalizeScopeLevels: core.normalizeScopeLevels,
};
