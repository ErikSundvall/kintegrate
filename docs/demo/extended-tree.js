// Extend the Tree class with context boundary functionality
class ExtendedTree extends Tree {
    constructor(selector, options) {
        super(selector, options);
        this.contextBoundaries = new Set();
    }

    isContextBoundary(nodeId) {
        return this.contextBoundaries.has(nodeId);
    }

    setContextBoundary(nodeId, isEnabled) {
        // Remove context-boundary class from all elements in the tree
        const allBoundaries = document.querySelectorAll('.context-boundary');
        allBoundaries.forEach(element => {
            element.classList.remove('context-boundary');
        });
        
        // Clear the set of tracked boundaries
        this.contextBoundaries.clear();

        // If enabling, set the new boundary
        if (isEnabled) {
            this.contextBoundaries.add(nodeId);
        }

        // Update visual state of the current node
        const node = this.nodesById[nodeId];
        if (node) {
            const element = document.querySelector(`[data-id="${nodeId}"]`);
            if (element) {
                element.classList.toggle('context-boundary', isEnabled);
            }
        }
    }
}