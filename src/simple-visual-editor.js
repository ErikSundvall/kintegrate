class SimpleVisualEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.nodes = [];
        this.connections = [];
        this.draggedNode = null;
        this.eventBus = new BroadcastChannel('kintegrate-configurator');
        
        this.init();
    }

    init() {
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        
        // Create SVG for connections
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        `;
        this.container.appendChild(this.svg);

        this.createNodes();
        this.setupConnections();
        this.renderConnections();

        console.log('Simple visual editor initialized');
    }

    createNodes() {
        const nodeConfigs = [
            { id: 'source-node', type: 'example-source', title: 'Data Source', x: 50, y: 100 },
            { id: 'converter-node', type: 'example-converter', title: 'Converter', x: 300, y: 100 },
            { id: 'target-node', type: 'example-target', title: 'Target', x: 550, y: 100 }
        ];

        nodeConfigs.forEach(config => {
            const node = this.createNode(config);
            this.nodes.push(node);
            this.container.appendChild(node.element);
        });
    }

    createNode(config) {
        const element = document.createElement('div');
        element.className = 'rete-node';
        element.id = config.id;
        element.style.left = config.x + 'px';
        element.style.top = config.y + 'px';

        element.innerHTML = `
            <div class="rete-node-title">${config.title}</div>
            <div style="position: relative; height: 40px;">
                ${config.type !== 'example-source' ? '<div class="rete-socket rete-input-socket" data-socket="input" title="Input"></div>' : ''}
                ${config.type !== 'example-target' ? '<div class="rete-socket rete-output-socket" data-socket="output" title="Output"></div>' : ''}
            </div>
        `;

        // Make draggable
        this.makeDraggable(element);

        return {
            id: config.id,
            type: config.type,
            element: element,
            x: config.x,
            y: config.y
        };
    }

    makeDraggable(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('rete-socket')) return;
            
            isDragging = true;
            element.classList.add('selected');
            
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseInt(element.style.left);
            initialY = parseInt(element.style.top);
            
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = initialX + (e.clientX - startX);
            const y = initialY + (e.clientY - startY);
            
            element.style.left = x + 'px';
            element.style.top = y + 'px';
            
            // Update node position
            const node = this.nodes.find(n => n.element === element);
            if (node) {
                node.x = x;
                node.y = y;
            }
            
            this.renderConnections();
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.classList.remove('selected');
            }
        });
    }

    setupConnections() {
        this.connections = [
            {
                from: { nodeId: 'source-node', socket: 'output' },
                to: { nodeId: 'converter-node', socket: 'input' }
            },
            {
                from: { nodeId: 'converter-node', socket: 'output' },
                to: { nodeId: 'target-node', socket: 'input' }
            }
        ];
    }

    renderConnections() {
        // Clear existing connections
        this.svg.innerHTML = '';

        this.connections.forEach(connection => {
            const fromNode = this.nodes.find(n => n.id === connection.from.nodeId);
            const toNode = this.nodes.find(n => n.id === connection.to.nodeId);

            if (fromNode && toNode) {
                const path = this.createConnectionPath(fromNode, toNode);
                this.svg.appendChild(path);
            }
        });
    }

    createConnectionPath(fromNode, toNode) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Calculate socket positions
        const fromX = fromNode.x + 150 + 6; // Node width + socket offset
        const fromY = fromNode.y + 35; // Approximate socket Y position
        const toX = toNode.x - 6; // Socket offset
        const toY = toNode.y + 35;

        // Create bezier curve
        const midX = (fromX + toX) / 2;
        const pathData = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
        
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'rete-connection');
        
        return path;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('rete-container')) {
        const editor = new SimpleVisualEditor('rete-container');
        window.visualEditor = editor;
    }
});