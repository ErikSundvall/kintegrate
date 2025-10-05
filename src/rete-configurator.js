class ReteConfigurator {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.editor = null;
        this.engine = null;
        this.init();
    }

    async init() {
        try {
            // Create Rete editor
            this.editor = new Rete.NodeEditor('kintegrate@0.1.0', this.container);
            this.engine = new Rete.Engine('kintegrate@0.1.0');

            // Add plugins
            this.editor.use(ReteAreaPlugin.AreaPlugin);
            this.editor.use(ReteConnectionPlugin.ConnectionPlugin);
            this.editor.use(ReteRenderPlugin.RenderPlugin);

            // Register components
            this.registerComponents();

            // Create initial setup
            await this.createInitialSetup();

            console.log('Rete configurator initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Rete configurator:', error);
            this.showError(error);
        }
    }

    registerComponents() {
        // Register our custom web components as Rete components
        const sourceComponent = new WebComponentWrapper('example-source', ExampleSource);
        const converterComponent = new WebComponentWrapper('example-converter', ExampleConverter);
        const targetComponent = new WebComponentWrapper('example-target', ExampleTarget);

        this.editor.register(sourceComponent);
        this.editor.register(converterComponent);
        this.editor.register(targetComponent);

        this.engine.register(sourceComponent);
        this.engine.register(converterComponent);
        this.engine.register(targetComponent);
    }

    async createInitialSetup() {
        // Create source node
        const sourceNode = await this.createNode('example-source', { x: 100, y: 200 });
        
        // Create converter node
        const converterNode = await this.createNode('example-converter', { x: 400, y: 200 });
        
        // Create target node
        const targetNode = await this.createNode('example-target', { x: 700, y: 200 });

        // Connect them: source -> converter -> target
        await this.connectNodes(sourceNode, 'data', converterNode, 'inputData');
        await this.connectNodes(converterNode, 'outputData', targetNode, 'data');

        // Update view
        this.editor.view.resize();
        this.editor.trigger('process');
    }

    async createNode(componentName, position) {
        const component = this.editor.components.get(componentName);
        const node = await component.createNode({});
        
        node.position = [position.x, position.y];
        this.editor.addNode(node);
        
        return node;
    }

    async connectNodes(outputNode, outputKey, inputNode, inputKey) {
        const output = outputNode.outputs.get(outputKey);
        const input = inputNode.inputs.get(inputKey);
        
        if (output && input) {
            const connection = new Rete.Connection(output, input);
            this.editor.addConnection(connection);
            return connection;
        }
        
        console.warn(`Failed to connect ${outputNode.name}:${outputKey} -> ${inputNode.name}:${inputKey}`);
        return null;
    }

    showError(error) {
        this.container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: red;">
                <h3>Failed to load Rete configurator</h3>
                <p>${error.message}</p>
                <p style="font-size: 0.9em; color: #666;">
                    Make sure all required scripts are loaded properly.
                </p>
            </div>
        `;
    }
}

// Web Component Wrapper for Rete integration
class WebComponentWrapper extends Rete.Component {
    constructor(name, componentClass) {
        super(name);
        this.componentClass = componentClass;
        this.properties = componentClass.properties || {};
        this.events = componentClass.events || {};
    }

    async builder(node) {
        // Create inputs and outputs based on component properties
        for (const [propName, propConfig] of Object.entries(this.properties)) {
            if (propConfig.socket === 'input') {
                const input = new Rete.Input(propName, propName, new Rete.Socket(propConfig.type));
                node.addInput(input);
            } else if (propConfig.socket === 'output') {
                const output = new Rete.Output(propName, propName, new Rete.Socket(propConfig.type));
                node.addOutput(output);
            }
        }

        // Add controls for non-socket properties
        for (const [propName, propConfig] of Object.entries(this.properties)) {
            if (propConfig.socket === false && propConfig.control) {
                // Add control for property (simplified for demo)
                if (propConfig.control === 'select' && propConfig.options) {
                    const control = new SelectControl(propName, propConfig.options);
                    node.addControl(control);
                }
            }
        }

        return node;
    }

    worker(node, inputs, outputs) {
        // Simple pass-through for demo
        // In a real implementation, this would handle the data flow
        for (const [key, input] of Object.entries(inputs)) {
            if (input.length > 0 && outputs[key]) {
                outputs[key] = input[0];
            }
        }
    }
}

// Simple select control for Rete
class SelectControl extends Rete.Control {
    constructor(key, options) {
        super(key);
        this.component = 'select';
        this.props = { options };
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Rete !== 'undefined') {
        const configurator = new ReteConfigurator('rete-container');
        window.reteConfigurator = configurator;
    } else {
        console.error('Rete.js not loaded');
    }
});