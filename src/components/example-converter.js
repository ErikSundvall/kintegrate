class ExampleConverter extends HTMLElement {
    constructor() {
        super();
        this.eventBus = new BroadcastChannel('kintegrate-configurator');
        this.inputData = '';
        this.outputData = '';
        this.filter = 'toUpperCase';
        this.acceptedSources = []; // Allow configuration of which sources to accept
    }

    static get observedAttributes() {
        return ['filter', 'accept-from'];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.updateAcceptedSources();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'filter') {
            this.filter = newValue;
            this.processData();
        } else if (name === 'accept-from') {
            this.updateAcceptedSources();
        }
    }

    updateAcceptedSources() {
        const acceptFrom = this.getAttribute('accept-from');
        if (acceptFrom) {
            // Parse comma-separated list of source types/IDs
            this.acceptedSources = acceptFrom.split(',').map(s => s.trim());
        } else {
            // Default: accept from any source
            this.acceptedSources = ['*'];
        }
    }

    render() {
        this.innerHTML = `
            <div style="border: 1px solid #ccc; border-radius: 4px; padding: 10px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                    Example Converter:
                </label>
                <div style="margin-bottom: 10px;">
                    <label>Filter function:</label>
                    <select id="filter-select" style="margin-left: 5px;">
                        <option value="toUpperCase">toUpperCase()</option>
                        <option value="toLowerCase">toLowerCase()</option>
                        <option value="trim">trim()</option>
                        <option value="reverse">reverse()</option>
                        <option value="substring">substring(0,10)</option>
                    </select>
                </div>
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1;">
                        <label style="display: block; font-size: 0.9em; color: #666;">Input:</label>
                        <textarea id="input-display" readonly style="width: 100%; height: 60px; background: #f9f9f9; font-size: 0.8em;"></textarea>
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; font-size: 0.9em; color: #666;">Output:</label>
                        <textarea id="output-display" readonly style="width: 100%; height: 60px; background: #f0f8ff; font-size: 0.8em;"></textarea>
                    </div>
                </div>
                <div style="margin-top: 5px; font-size: 0.8em; color: #666;">
                    Accepts data from: <span id="accepted-sources">${this.getAcceptedSourcesDisplay()}</span>
                </div>
            </div>
        `;

        // Set current filter
        const select = this.querySelector('#filter-select');
        select.value = this.filter;
    }

    getAcceptedSourcesDisplay() {
        if (this.acceptedSources.includes('*')) {
            return 'any source';
        }
        return this.acceptedSources.join(', ') || 'none';
    }

    setupEventListeners() {
        const select = this.querySelector('#filter-select');
        select.addEventListener('change', (e) => {
            this.filter = e.target.value;
            this.processData();
        });

        // Listen for input data via BroadcastChannel - now with flexible source filtering
        this.eventBus.addEventListener('message', (event) => {
            if (event.data.type === 'data-changed') {
                if (this.shouldAcceptData(event.data)) {
                    this.receiveData(event.data.data, event.data.source, event.data.elementId);
                }
            }
        });
    }

    shouldAcceptData(eventData) {
        // Accept all sources if '*' is in acceptedSources
        if (this.acceptedSources.includes('*')) {
            return true;
        }

        // Check if source type is accepted
        if (this.acceptedSources.includes(eventData.source)) {
            return true;
        }

        // Check if specific element ID is accepted
        if (eventData.elementId && this.acceptedSources.includes(eventData.elementId)) {
            return true;
        }

        return false;
    }

    receiveData(data, source = 'unknown', elementId = null) {
        this.inputData = data;
        this.lastSource = { source, elementId };
        
        const inputDisplay = this.querySelector('#input-display');
        if (inputDisplay) {
            inputDisplay.value = data;
            inputDisplay.title = `From: ${source}${elementId ? ` (${elementId})` : ''}`;
        }
        
        this.processData();
    }

    processData() {
        if (!this.inputData) return;

        let result = this.inputData;

        try {
            switch (this.filter) {
                case 'toUpperCase':
                    result = this.inputData.toUpperCase();
                    break;
                case 'toLowerCase':
                    result = this.inputData.toLowerCase();
                    break;
                case 'trim':
                    result = this.inputData.trim();
                    break;
                case 'reverse':
                    result = this.inputData.split('').reverse().join('');
                    break;
                case 'substring':
                    result = this.inputData.substring(0, 10);
                    break;
                default:
                    result = this.inputData;
            }
        } catch (error) {
            result = `Error: ${error.message}`;
        }

        this.outputData = result;
        
        const outputDisplay = this.querySelector('#output-display');
        if (outputDisplay) {
            outputDisplay.value = result;
        }

        this.fireOutputEvent();
    }

    fireOutputEvent() {
        this.eventBus.postMessage({
            type: 'data-changed',
            source: 'example-converter',
            elementId: this.id,
            data: this.outputData,
            metadata: {
                filter: this.filter,
                originalSource: this.lastSource
            }
        });

        this.dispatchEvent(new CustomEvent('dataChanged', {
            detail: { 
                data: this.outputData,
                filter: this.filter,
                originalSource: this.lastSource
            },
            bubbles: true
        }));
    }

    // Public API methods
    getInputData() {
        return this.inputData;
    }

    getOutputData() {
        return this.outputData;
    }

    setFilter(filter) {
        this.filter = filter;
        const select = this.querySelector('#filter-select');
        if (select) {
            select.value = filter;
        }
        this.processData();
    }

    setAcceptedSources(sources) {
        if (Array.isArray(sources)) {
            this.acceptedSources = sources;
        } else if (typeof sources === 'string') {
            this.acceptedSources = sources.split(',').map(s => s.trim());
        }
        
        this.setAttribute('accept-from', this.acceptedSources.join(','));
        
        // Update display
        const sourcesSpan = this.querySelector('#accepted-sources');
        if (sourcesSpan) {
            sourcesSpan.textContent = this.getAcceptedSourcesDisplay();
        }
    }

    // Method to receive data programmatically (for direct connections)
    receiveDataDirect(data, sourceInfo = {}) {
        this.receiveData(data, sourceInfo.source || 'direct', sourceInfo.elementId);
    }

    // Properties for Rete integration
    static get properties() {
        return {
            inputData: { type: 'string', socket: 'input' },
            outputData: { type: 'string', socket: 'output' },
            filter: { type: 'string', socket: false, control: 'select', 
                     options: ['toUpperCase', 'toLowerCase', 'trim', 'reverse', 'substring'] },
            acceptedSources: { type: 'array', socket: false, control: 'text' }
        };
    }

    static get events() {
        return {
            dataChanged: { type: 'output', dataType: 'string' }
        };
    }
}

customElements.define('example-converter', ExampleConverter);