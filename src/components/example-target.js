class ExampleTarget extends HTMLElement {
    constructor() {
        super();
        this.eventBus = new BroadcastChannel('kintegrate-configurator');
        this.data = '';
    }

    connectedCallback() {
        this.innerHTML = `
            <div style="border: 1px solid #ccc; border-radius: 4px; padding: 10px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                    Example Target:
                </label>
                <textarea 
                    id="target-textarea" 
                    readonly
                    style="width: 100%; height: 100px; resize: vertical; font-family: monospace; background: #f0f8ff;"
                    placeholder="Processed data will appear here..."
                ></textarea>
                <div style="margin-top: 5px; font-size: 0.8em; color: #666;">
                    Data type: <span id="data-type">string</span>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for data via BroadcastChannel
        this.eventBus.addEventListener('message', (event) => {
            if (event.data.type === 'data-changed' && 
                event.data.source === 'example-converter') {
                this.receiveData(event.data.data);
            }
        });
    }

    receiveData(data) {
        this.data = data;
        this.displayData(data);
    }

    displayData(data) {
        const textarea = this.querySelector('#target-textarea');
        const typeSpan = this.querySelector('#data-type');
        
        if (!textarea || !typeSpan) return;

        let displayValue = '';
        let dataType = typeof data;

        if (data === null) {
            displayValue = 'null';
            dataType = 'null';
        } else if (data === undefined) {
            displayValue = 'undefined';
            dataType = 'undefined';
        } else if (typeof data === 'string') {
            displayValue = data;
            dataType = 'string';
        } else if (typeof data === 'number' || typeof data === 'boolean') {
            displayValue = String(data);
            dataType = typeof data;
        } else {
            // Objects, arrays, etc. - stringify as JSON
            try {
                displayValue = JSON.stringify(data, null, 2);
                dataType = Array.isArray(data) ? 'array' : 'object';
            } catch (error) {
                displayValue = `[Cannot display: ${error.message}]`;
                dataType = 'unknown';
            }
        }

        textarea.value = displayValue;
        typeSpan.textContent = dataType;
    }

    // Public API
    getData() {
        return this.data;
    }

    setData(data) {
        this.data = data;
        this.displayData(data);
    }

    // Properties for Rete integration
    static get properties() {
        return {
            data: { type: 'any', socket: 'input' }
        };
    }

    static get events() {
        return {
            // Target typically doesn't emit events, just receives
        };
    }
}

customElements.define('example-target', ExampleTarget);