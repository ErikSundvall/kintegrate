"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFieldIndex = buildFieldIndex;
exports.resolveRulePath = resolveRulePath;
exports.resolveRulePathDetails = resolveRulePathDetails;
function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function uniqueValues(values) {
    return [...new Set(values.filter((value) => Boolean(value)))];
}
function buildFieldIndex(source) {
    const tagToPaths = new Map();
    function walk(node, context = { structuralPath: [] }) {
        if (!isRecord(node)) {
            return;
        }
        const entry = {
            tag: typeof node.formId === 'string'
                ? node.formId
                : typeof node.tag === 'string'
                    ? node.tag
                    : typeof node.alias === 'string'
                        ? node.alias
                        : typeof node.id === 'string'
                            ? node.id
                            : null,
            path: typeof node.aqlPath === 'string'
                ? node.aqlPath
                : typeof node.path === 'string'
                    ? node.path
                    : null,
            structuralPath: null
        };
        const nextStructuralPath = entry.tag
            ? [...context.structuralPath, entry.tag]
            : context.structuralPath;
        entry.structuralPath = nextStructuralPath.length ? nextStructuralPath.join('/') : null;
        const preferredPaths = uniqueValues([entry.path, entry.structuralPath, entry.tag]);
        if (entry.tag) {
            const knownPaths = tagToPaths.get(entry.tag) || [];
            tagToPaths.set(entry.tag, [...new Set([...knownPaths, ...preferredPaths])]);
        }
        Object.values(node).forEach((value) => {
            if (Array.isArray(value)) {
                value.forEach((item) => walk(item, { structuralPath: nextStructuralPath }));
                return;
            }
            if (isRecord(value)) {
                walk(value, { structuralPath: nextStructuralPath });
            }
        });
    }
    walk(source);
    tagToPaths.allPathsFor = function allPathsFor(identifier) {
        if (!identifier) {
            return [];
        }
        return [...(this.get(identifier) || [])];
    };
    tagToPaths.preferredPathFor = function preferredPathFor(identifier) {
        return this.allPathsFor(identifier)[0] || null;
    };
    return tagToPaths;
}
function resolveRulePath(fieldIndex, identifier, explicitPath) {
    if (explicitPath) {
        return explicitPath;
    }
    if (!identifier || !fieldIndex) {
        return null;
    }
    const candidates = fieldIndex.get(identifier) || [];
    return candidates[0] || null;
}
function resolveRulePathDetails(fieldIndex, identifier, explicitPath) {
    const candidates = uniqueValues([
        explicitPath,
        ...(fieldIndex?.allPathsFor(identifier) || [])
    ]);
    return {
        candidates,
        primary: candidates[0] || identifier || 'unknown'
    };
}
