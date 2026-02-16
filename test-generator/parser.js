function collectDependencyRules(node, rules, context = {}) {
  if (!node || typeof node !== 'object') {
    return;
  }

  const nextContext = {
    currentPath: node.aqlPath || node.path || context.currentPath || null,
    currentTag: node.tag || node.alias || node.id || context.currentTag || null
  };

  Object.entries(node).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    if (/dependenc|visibility/i.test(key)) {
      const candidates = Array.isArray(value) ? value : [value];
      candidates.forEach((candidate, index) => {
        if (!candidate || typeof candidate !== 'object') {
          return;
        }

        rules.push({
          key,
          index,
          triggerPath:
            candidate.triggerPath ||
            candidate.sourcePath ||
            candidate.dependsOn ||
            candidate.field ||
            nextContext.currentPath,
          triggerTag:
            candidate.triggerTag ||
            candidate.sourceTag ||
            candidate.tag ||
            nextContext.currentTag,
          targetPath: candidate.targetPath || candidate.path || nextContext.currentPath,
          targetTag: candidate.targetTag || candidate.target || nextContext.currentTag,
          showValue: candidate.triggerValue ?? candidate.value ?? true,
          hideValue: candidate.falsyValue ?? false,
          description: candidate.description || candidate.name || ''
        });
      });
    }
  });

  Object.values(node).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => collectDependencyRules(item, rules, nextContext));
    } else if (value && typeof value === 'object') {
      collectDependencyRules(value, rules, nextContext);
    }
  });
}

function parseFormDefinition(input) {
  const source = input?.formDescription || input?.webTemplate || input;
  const rules = [];
  collectDependencyRules(source, rules);
  return {
    name: input?.name || source?.name || source?.templateId || 'generated-form',
    dependencies: rules
  };
}

module.exports = {
  parseFormDefinition
};
