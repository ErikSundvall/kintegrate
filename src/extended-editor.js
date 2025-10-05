class ExtendedEditor extends HTMLElement {
    constructor() {
        super();
        this.eventBus = new BroadcastChannel('kintegrate-events');
        this.editor = null;
        this.autoConvertEnabled = true;
        this.autoPrecompileEnabled = false;
        this.debounceTimeout = null;
        this.precompileTimeout = null;
        
        this.setupEventListeners();
    }

    connectedCallback() {
        this.innerHTML = this.getTemplate();
        this.initializeEditor();
        this.attachButtonHandlers();
    }

    disconnectedCallback() {
        this.eventBus.close();
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        if (this.precompileTimeout) {
            clearTimeout(this.precompileTimeout);
        }
    }

    getTemplate() {
        return `
            <div id="extended-editor">
                <textarea id="template-editor">{{!-- <--- This is how you start a comment block in Handlebars
Use the tree on the left to get started quickly by right-clicking nodes or by selecting them and clicking the buttons at the bottom of the tree.

{{#with granskning}}
  {{#each rubrik}}
    {{#each behållare}}
      {{#each deltagare}}
        {{#each deltagare}}
          Dr. {{namn.[0].[|value]}} (Specialitet: {{vårdgivarroll.[0].specialitet.[0].[|value]}})
        {{/each}}
      {{/each}}
    {{/each}}
  {{/with}}

Bakgrund:
{{#with granskning}}
  {{#each bakgrund}}
    {{#each sjukdomshistoria}}
      {{#each ospecificerad_händelse}}
        {{#if aktuellt.[0].[|value]}}
          <strong>Aktuellt:</strong> {{aktuellt.[0].[|value]}}
        {{/if}}
        {{#if anamnes.[0].[|value]}}
          <strong>Anamnes:</strong> {{anamnes.[0].[|value]}}
        {{/if}}
        {{#if komorbiditet.[0].[|value]}}
          <strong>Komorbiditet:</strong> {{komorbiditet.[0].[|value]}}
        {{/if}}
      {{/each}}
    {{/each}}
  {{/each}}
{{/with}}

--}}</textarea>
            </div>
            
            <div id="conversion-buttons" class="editor-buttons">
                <button id="auto-convert-button" class="toggle-button active" title="Auto-convert on change">
                    <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8m-1 12H9V8h2zm1 0V8l5 4z" opacity=".3"></path>
                        <path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-1 6H9v8h2zm6 4-5-4v8z"></path>
                    </svg>
                </button>
                
                <button id="undo-button" title="Undo">
                    <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8"></path>
                    </svg>
                </button>
                
                <button id="redo-button" title="Redo">
                    <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7z"></path>
                    </svg>
                </button>
                
                <button id="copy-button" title="Copy template to clipboard">
                    <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M9 4h9v12H9z" opacity=".3"></path>
                        <path d="M18 2H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H9V4h9zM3 15v-2h2v2zm0-5.5h2v2H3zM10 20h2v2h-2zm-7-1.5v-2h2v2zM5 22c-1.1 0-2-.9-2-2h2zm3.5 0h-2v-2h2zm5 0v-2h2c0 1.1-.9 2-2 2M5 6v2H3c0-1.1.9-2 2-2"></path>
                    </svg>
                </button>
                
                <button id="erase-button" title="Clear template">
                    <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M16 9H8v10h8zm-.47 7.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12 1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14z" opacity=".3"></path>
                        <path d="M14.12 10.47 12 12.59l-2.13-2.12-1.41 1.41L10.59 14l-2.12 2.12 1.41 1.41L12 15.41l2.12 2.12 1.41-1.41L13.41 14l2.12-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4zM6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM8 9h8v10H8z"></path>
                    </svg>
                </button>
                
                <button id="download-button" title="Download template">
                    <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3zm-1-4-1.41-1.41L13 12.17V4h-2v8.17L8.41 9.59 7 11l5 5z"></path>
                    </svg>
                </button>
                
                <button id="upload-button" title="Upload template">
                    <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3zM7 9l1.41 1.41L11 7.83V16h2V7.83l2.59 2.58L17 9l-5-5z"></path>
                    </svg>
                </button>
                
                <button id="load-examples-button" title="Load example template from server">
                    <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m-3 2v5l-1-.75L15 9V4zm3 12H8V4h5v9l3-2.25L19 13V4h1z"></path>
                    </svg>
                </button>
                
                <button id="show-compiled" class="toggle-button" title="Show/hide precompiled template">
                    <svg focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M4 18h16V8H4zm8-3h6v2h-6zm-5.91-4.59L7.5 9l4 4-4 4-1.41-1.41L8.67 13z" opacity=".3"></path>
                        <path d="M12 15h6v2h-6z"></path>
                        <path d="M20 4H4c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2m0 14H4V8h16z"></path>
                        <path d="m7.5 17 4-4-4-4-1.41 1.41L8.67 13l-2.58 2.59z"></path>
                    </svg>
                </button>
            </div>
            
            <div id="precompile-container" style="display: none;">
                <textarea id="precompiled-textarea" readonly style="width: 100%; height: 200px; resize: vertical; padding-right: 70px; box-sizing: border-box;"></textarea>
                <div class="floating-buttons" style="position: absolute; top: 8px; right: 24px; z-index: 10; display: flex; flex-direction: row; background: white; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 4px;">
                    <button id="copy-precompiled-button" title="Copy precompiled template">
                        <svg style="width: 16px; height: 16px; fill: currentColor;" focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                            <path d="M9 4h9v12H9z" opacity=".3"></path>
                            <path d="M18 2H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H9V4h9zM3 15v-2h2v2zm0-5.5h2v2H3zM10 20h2v2h-2zm-7-1.5v-2h2v2zM5 22c-1.1 0-2-.9-2-2h2zm3.5 0h-2v-2h2zm5 0v-2h2c0 1.1-.9 2-2 2M5 6v2H3c0-1.1.9-2 2-2"></path>
                        </svg>
                    </button>
                    <button id="close-precompiled-button" title="Close precompiled view">
                        <svg style="width: 16px; height: 16px; fill: currentColor;" focusable="false" aria-hidden="true" viewBox="0 0 24 24">
                            <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    initializeEditor() {
        const textarea = this.querySelector('#template-editor');
        if (typeof CodeMirror !== 'undefined') {
            this.editor = CodeMirror.fromTextArea(textarea, {
                mode: 'handlebars',
                lineNumbers: true,
                lineWrapping: true,
                theme: 'default',
                autoCloseBrackets: true,
                matchBrackets: true,
                indentUnit: 2,
                tabSize: 2,
                indentWithTabs: false
            });

            this.editor.on('change', () => {
                this.handleTemplateChange();
            });
        }
    }

    setupEventListeners() {
        this.eventBus.addEventListener('message', (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'tree-selection-output':
                    this.insertAtCursor(data.content);
                    break;
                case 'input-content-changed':
                    if (this.autoConvertEnabled) {
                        this.debouncedConvert();
                    }
                    break;
            }
        });
    }

    attachButtonHandlers() {
        this.querySelector('#auto-convert-button')?.addEventListener('click', () => {
            this.toggleAutoConvert();
        });

        this.querySelector('#undo-button')?.addEventListener('click', () => {
            if (this.editor) this.editor.undo();
        });

        this.querySelector('#redo-button')?.addEventListener('click', () => {
            if (this.editor) this.editor.redo();
        });

        this.querySelector('#copy-button')?.addEventListener('click', () => {
            this.copyToClipboard();
        });

        this.querySelector('#erase-button')?.addEventListener('click', () => {
            if (this.editor) {
                this.editor.setValue('');
                this.runConversion();
            }
        });

        this.querySelector('#download-button')?.addEventListener('click', () => {
            this.downloadTemplate();
        });

        this.querySelector('#upload-button')?.addEventListener('click', () => {
            this.uploadTemplate();
        });

        this.querySelector('#load-examples-button')?.addEventListener('click', () => {
            this.eventBus.postMessage({
                type: 'show-examples-menu',
                data: { source: 'conversion-scripts' }
            });
        });

        this.querySelector('#show-compiled')?.addEventListener('click', () => {
            this.togglePrecompiledView();
        });

        this.querySelector('#copy-precompiled-button')?.addEventListener('click', () => {
            this.copyPrecompiledToClipboard();
        });

        this.querySelector('#close-precompiled-button')?.addEventListener('click', () => {
            this.hidePrecompiledView();
        });
    }

    handleTemplateChange() {
        if (this.autoConvertEnabled) {
            this.debouncedConvert();
        }
        if (this.autoPrecompileEnabled) {
            this.debouncedPrecompile();
        }
    }

    debouncedConvert() {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        
        const delay = this.getDebounceDelay();
        this.debounceTimeout = setTimeout(() => {
            this.runConversion();
        }, delay);
    }

    debouncedPrecompile() {
        if (this.precompileTimeout) {
            clearTimeout(this.precompileTimeout);
        }
        
        const delay = this.getDebounceDelay();
        this.precompileTimeout = setTimeout(() => {
            this.updatePrecompiled();
        }, delay);
    }

    getDebounceDelay() {
        const delayInput = document.querySelector('#auto-convert-delay');
        return delayInput ? parseInt(delayInput.value) || 500 : 500;
    }

    runConversion() {
        try {
            const template = this.editor ? this.editor.getValue() : '';
            const startTime = performance.now();
            
            const jsonString = window.inputEditor ? window.inputEditor.getValue() : '{}';
            
            if (!jsonString.trim() || !template.trim()) {
                this.eventBus.postMessage({
                    type: 'converted-output-ready',
                    data: { output: '', status: 'No input or template', duration: 0 }
                });
                return;
            }

            const jsonData = JSON.parse(jsonString);
            
            if (typeof Handlebars !== 'undefined') {
                const compiledTemplate = Handlebars.compile(template);
                const output = compiledTemplate(jsonData);
                const duration = performance.now() - startTime;
                
                this.eventBus.postMessage({
                    type: 'converted-output-ready',
                    data: { output, status: 'Success', duration }
                });
            }
        } catch (error) {
            this.eventBus.postMessage({
                type: 'converted-output-ready',
                data: { output: '', status: `Error: ${error.message}`, duration: 0 }
            });
        }
    }

    insertAtCursor(content) {
        if (this.editor) {
            const cursor = this.editor.getCursor();
            this.editor.replaceRange(content, cursor);
            this.editor.focus();
        }
    }

    toggleAutoConvert() {
        this.autoConvertEnabled = !this.autoConvertEnabled;
        const button = this.querySelector('#auto-convert-button');
        if (button) {
            button.classList.toggle('active', this.autoConvertEnabled);
        }
        
        if (this.autoConvertEnabled) {
            this.runConversion();
        }
    }

    togglePrecompiledView() {
        this.autoPrecompileEnabled = !this.autoPrecompileEnabled;
        const container = this.querySelector('#precompile-container');
        const button = this.querySelector('#show-compiled');
        
        if (this.autoPrecompileEnabled) {
            container.style.display = 'block';
            button.classList.add('active');
            this.updatePrecompiled();
        } else {
            container.style.display = 'none';
            button.classList.remove('active');
        }
    }

    hidePrecompiledView() {
        this.autoPrecompileEnabled = false;
        const container = this.querySelector('#precompile-container');
        const button = this.querySelector('#show-compiled');
        
        container.style.display = 'none';
        button.classList.remove('active');
    }

    updatePrecompiled() {
        try {
            const template = this.editor ? this.editor.getValue() : '';
            if (template.trim() && typeof Handlebars !== 'undefined') {
                const compiled = Handlebars.precompile(template);
                const textarea = this.querySelector('#precompiled-textarea');
                if (textarea) {
                    textarea.value = compiled;
                }
            }
        } catch (error) {
            const textarea = this.querySelector('#precompiled-textarea');
            if (textarea) {
                textarea.value = `Error: ${error.message}`;
            }
        }
    }

    copyToClipboard() {
        if (this.editor) {
            navigator.clipboard.writeText(this.editor.getValue()).then(() => {
                const button = this.querySelector('#copy-button');
                if (button) {
                    button.classList.add('success');
                    setTimeout(() => button.classList.remove('success'), 1000);
                }
            });
        }
    }

    copyPrecompiledToClipboard() {
        const textarea = this.querySelector('#precompiled-textarea');
        if (textarea) {
            navigator.clipboard.writeText(textarea.value).then(() => {
                const button = this.querySelector('#copy-precompiled-button');
                if (button) {
                    button.style.backgroundColor = '#4caf50';
                    setTimeout(() => button.style.backgroundColor = '', 1000);
                }
            });
        }
    }

    downloadTemplate() {
        if (this.editor) {
            const content = this.editor.getValue();
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'template.hbs';
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    uploadTemplate() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.hbs,.handlebars';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (this.editor) {
                        this.editor.setValue(e.target.result);
                        if (this.autoConvertEnabled) {
                            this.runConversion();
                        }
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    getValue() {
        return this.editor ? this.editor.getValue() : '';
    }

    setValue(content) {
        if (this.editor) {
            this.editor.setValue(content);
        }
    }

    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }
}

customElements.define('extended-editor', ExtendedEditor);