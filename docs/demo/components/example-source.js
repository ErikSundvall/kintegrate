class ExampleSource extends HTMLElement {
    constructor() {
        super();
        this.eventBus = new BroadcastChannel('kintegrate-configurator');
        this.data = '';
    }

    connectedCallback() {
        this.innerHTML = `
            <div style="border: 1px solid #ccc; border-radius: 4px; padding: 10px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                    Example Source:
                </label>
                <textarea 
                    id="source-textarea" 
                    style="width: 100%; height: 100px; resize: vertical; font-family: monospace;"
                    placeholder="Enter your example text here..."
                >Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
Ut enim ad minim veniam, quis nostrud exercitation.</textarea>
            </div>
        `;

        const textarea = this.querySelector('#source-textarea');
        textarea.addEventListener('input', (e) => {
            this.data = e.target.value;
            this.fireDataEvent();
        });

        // Set initial data
        this.data = textarea.value;
        setTimeout(() => this.fireDataEvent(), 100);
    }

    fireDataEvent() {
        this.eventBus.postMessage({
            type: 'data-changed',
            source: 'example-source',
            elementId: this.id,
            data: this.data
        });

        // Also dispatch custom event for direct listeners
        this.dispatchEvent(new CustomEvent('dataChanged', {
            detail: { data: this.data },
            bubbles: true
        }));
    }

    // Public API
    getData() {
        return this.data;
    }

    setData(data) {
        this.data = data;
        const textarea = this.querySelector('#source-textarea');
        if (textarea) {
            textarea.value = data;
        }
        this.fireDataEvent();
    }

    // Properties for Rete integration
    static get properties() {
        return {
            data: { type: 'string', socket: 'output' }
        };
    }

    static get events() {
        return {
            dataChanged: { type: 'output', dataType: 'string' }
        };
    }
}

customElements.define('example-source', ExampleSource);