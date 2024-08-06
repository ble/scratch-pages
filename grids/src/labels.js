export class TemplateDef {
    tagId;
    templateId;
    templateHtml;
    injectedStyle;
    constructor(tagId, templateId, templateHtml, injectedStyle) {
        this.tagId = tagId;
        this.templateId = templateId;
        this.templateHtml = templateHtml;
        this.injectedStyle = injectedStyle;
    }
}
export class Templated extends HTMLElement {
    constructor() {
        super();
        if (this.usesShadowDom) {
            this.attachShadow({ mode: "open" });
        }
        const template = document.querySelector('#' + this.template.templateId);
        const content = template.content.cloneNode(true);
        this.root.appendChild(content);
    }
    get #tConstructor() {
        return this.constructor;
    }
    get template() {
        return this.#tConstructor.template;
    }
    get shadow() {
        return this.shadowRoot;
    }
    get usesShadowDom() {
        return true;
    }
    get root() {
        return this.usesShadowDom ? this.shadow : this;
    }
    #everConnected = false;
    static install(tClass, window) {
        if (document.querySelector('#' + tClass.template.templateId) !== null) {
            return;
        }
        const templateElt = window.document.createElement("template");
        templateElt.setAttribute("id", tClass.template.templateId);
        templateElt.innerHTML = tClass.template.templateHtml;
        window.document.body.appendChild(templateElt);
        if (tClass.template.injectedStyle !== undefined) {
            const styleElt = window.document.createElement("style");
            styleElt.setAttribute("id", tClass.template.templateId + "-style");
            styleElt.innerHTML = tClass.template.injectedStyle;
            window.document.head.appendChild(styleElt);
        }
        window.customElements.define(tClass.template.tagId, tClass);
    }
    attributeChangedCallback(name, oldValue, newValue) {
    }
    flushAttributeUpdates() {
        for (let attrName of this.getAttributeNames()) {
            this.attributeChangedCallback(attrName, null, this.getAttribute(attrName));
        }
    }
    connectedCallback() {
        if (!this.#everConnected) {
            this.flushAttributeUpdates();
            this.#everConnected = true;
        }
    }
}
export class TemplatedHelpers extends Templated {
    getElementById(id) {
        return this.shadow.getElementById(id);
    }
    byId(id) {
        return this.shadow.getElementById(id);
    }
    #defaultAbortController = new AbortController();
    #listenerRemovalControllers = {};
    #ownedListeners = [];
    // TODO: refactor this to use AbortController and AbortSignal
    // for removing event listeners.
    addOwnedEventListener(target, type, listener, controllerName) {
        target.addEventListener(type, listener, { signal: this.#getController(controllerName).signal });
    }
    #getController(controllerName) {
        if (controllerName === undefined) {
            return this.#defaultAbortController;
        }
        if (!(controllerName in this.#listenerRemovalControllers)) {
            this.#listenerRemovalControllers[controllerName] = new AbortController();
        }
        return this.#listenerRemovalControllers[controllerName];
    }
    removeAllOwnedListeners() {
        this.#defaultAbortController.abort();
        this.#defaultAbortController = new AbortController();
        for (let key in this.#listenerRemovalControllers) {
            this.#listenerRemovalControllers[key].abort();
            delete this.#listenerRemovalControllers[key];
        }
    }
    removeListeners(controllerName) {
        this.#getController(controllerName).abort();
        if (controllerName !== undefined) {
            delete this.#listenerRemovalControllers[controllerName];
        }
        else {
            this.#defaultAbortController = new AbortController();
        }
    }
}
export function getGlobalLabels() {
    if (window['globalLabels'] === undefined) {
        let noOpLabels = {
            set(k, v) {
                return noOpLabels;
            },
            render() {
                return noOpLabels;
            }
        };
        window['globalLabels'] = noOpLabels;
    }
    return window['globalLabels'];
}
export function setGlobalLabels(labels) {
    window['globalLabels'] = labels;
}
export class Labels extends Templated {
    static template = new TemplateDef("my-labels", "my-labels-template", `
<style>
:host {
  display: inline-block;
  position: relative;
}
.key::after {
  content: ": ";
}
.key.no-value {
  color: gray;
}
</style>
<div id="labels">
</div>`);
    constructor() {
        super();
    }
    #currentLabels = new Map();
    #nextLabels = new Map();
    getAttributeNames() {
        return ['always-show', 'never-show'];
    }
    get #alwaysShow() {
        const attr = this.getAttribute('always-show');
        const parts = attr === null ? [] : attr.split(/\s+/).filter(s => s !== "");
        return new Set(parts);
    }
    ;
    get #neverShow() {
        const attr = this.getAttribute('never-show');
        const parts = attr === null ? [] : attr.split(/\s+/).filter(s => s !== "");
        return new Set(parts);
    }
    #toShow() {
        const result = new Set(this.#currentLabels.keys());
        this.#alwaysShow.forEach(k => result.add(k));
        this.#neverShow.forEach(k => result.delete(k));
        return result;
    }
    set(k, v) {
        if (this.#nextLabels === null) {
            this.#nextLabels = new Map();
        }
        this.#nextLabels.set(k, v);
        return this;
    }
    render() {
        this.#currentLabels = this.#nextLabels === null ? new Map() : this.#nextLabels;
        this.#nextLabels = null;
        this.#renderLabels();
        return this;
    }
    #renderLabels() {
        const labels = this.shadow.getElementById("labels");
        labels.innerHTML = "";
        const labelsToShow = this.#toShow();
        for (let k of labelsToShow) {
            const label = document.createElement("div");
            label.classList.add("label");
            const key = document.createElement("span");
            key.classList.add("key");
            key.appendChild(document.createTextNode(k));
            const value = document.createElement("span");
            value.classList.add("value");
            if (this.#currentLabels.has(k)) {
                value.appendChild(document.createTextNode(this.#currentLabels.get(k).toString()));
            }
            else {
                key.classList.add("no-value");
            }
            label.appendChild(key);
            label.appendChild(value);
            labels.appendChild(label);
        }
    }
}
