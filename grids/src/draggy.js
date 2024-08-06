import { TemplateDef, TemplatedHelpers } from './labels.js';
/*
<div style="align-items: center; display: flex; justify-content: center; padding: 4rem 0">
    <div id="list">
        <div class="draggable">A</div>
        <div class="draggable">B</div>
        <div class="draggable">C</div>
        <div class="draggable">D</div>
        <div class="draggable">E</div>
    </div>
</div>
*/
export class Draggy extends TemplatedHelpers {
    static template = new TemplateDef('draggy-list', 'draggy-template', `
  <div class="draggy-list-container">
    <div class="placeholder item"></li>
  <ul>`, `
  body.dragging {
    user-select: none;
    -webkit-user-select: none;
  }
  draggy-list>.draggy-list-container {
    user-select: none;
    -webkit-user-select: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    .item {
      cursor: grab;
      padding: 0.25rem 2rem;
      margin: 0.05rem;
      border: 1px solid black;
      background-color: rgb(128,128,128);
      &.dragging {
        opacity: 0.75;
      }
    }
    .placeholder {
      display: none;
      border-style: dotted;
    }
    &.dragging .placeholder {
        display: block;
    }
  }
  `);
    get usesShadowDom() {
        return false;
    }
    get order() {
        const items = Array.from(this.root.querySelectorAll(".draggy-list-container>.draggable"));
        return items.map((li) => li.dataset["value"]);
    }
    addItem(value, display) {
        const li = document.createElement("div");
        li.classList.add("draggable", "item");
        li.dataset["value"] = value;
        li.textContent = (display || value);
        this.#container.appendChild(li);
    }
    // These are all the lifecycle callbacks of a custom element:
    //
    connectedCallback() {
        this.addOwnedEventListener(this.#container, "mousedown", (e) => this.#mouseDown(e));
        this.addOwnedEventListener(document, "mouseup", (e) => this.#mouseUp(e));
        // Set up event listener for the draggable children of the list.
    }
    disconnectedCallback() {
        // Clear the state of the event controller and remove the event listener.
    }
    get #container() {
        return this.root.querySelector(".draggy-list-container");
    }
    get #placeHolder() {
        return this.root.querySelector(".placeholder");
    }
    dragged;
    #offsetPoint;
    #orderChanged = false;
    #mouseIsDown = false;
    #mouseDown(event) {
        const target = event.target;
        if (!target.classList.contains("draggable")) {
            return;
        }
        document.body.classList.add("dragging");
        this.dragged = target;
        this.dragged.classList.add("dragging");
        const rect = this.dragged.getBoundingClientRect();
        this.dragged.style.top = rect.top + "px";
        this.dragged.style.position = "absolute";
        this.#offsetPoint = new DOMPoint(rect.left - event.pageX, event.pageY - rect.top);
        this.#placeHolder.style.height = rect.height + "px";
        const container = event.currentTarget;
        container.insertBefore(this.#placeHolder, this.dragged);
        container.classList.add("dragging");
        this.#mouseIsDown = true;
        this.#orderChanged = false;
        this.addOwnedEventListener(document, "mousemove", (e) => this.#mouseMove(e), "dragging");
        this.dispatchEvent(new CustomEvent("dragstart", { detail: { value: this.dragged.dataset["value"] } }));
    }
    #mouseUp(e) {
        document.body.classList.remove("dragging");
        this.#container.classList.remove("dragging");
        this.removeListeners("dragging");
        if (this.dragged) {
            this.dragged.classList.remove("dragging");
            this.dragged.style.removeProperty("position");
            this.dragged.style.removeProperty("top");
        }
        if (!this.#mouseIsDown) {
            return;
        }
        this.#mouseIsDown = false;
        this.dispatchEvent(new CustomEvent("dragend", { detail: { value: this.dragged?.dataset["value"] } }));
        if (this.#orderChanged) {
            this.dispatchEvent(new CustomEvent("orderchanged", { detail: { order: this.order } }));
        }
        this.dragged = undefined;
    }
    #mouseMove(e) {
        if (!this.dragged) {
            return;
        }
        this.dragged.style.top = (e.pageY - this.#offsetPoint.y) + "px";
        const placeHolder = this.#placeHolder;
        const prev = placeHolder.previousElementSibling;
        if (prev) {
            const rect = prev.getBoundingClientRect();
            if (e.pageY < rect.top + rect.height / 2) {
                this.#orderChanged = true;
                const index = childIndex(prev);
                prev.before(placeHolder);
                placeHolder.after(this.dragged);
                this.dispatchEvent(new CustomEvent("swapped", { detail: {
                        values: [prev.dataset["value"], this.dragged.dataset["value"]],
                        indices: [index, index + 1],
                        order: this.order,
                    } }));
                return;
            }
        }
        const next = this.dragged.nextElementSibling;
        if (next) {
            const rect = next.getBoundingClientRect();
            if (e.pageY > rect.top + rect.height / 2) {
                this.#orderChanged = true;
                const index = childIndex(next);
                next.after(placeHolder);
                placeHolder.after(this.dragged);
                this.dispatchEvent(new CustomEvent("swapped", { detail: {
                        values: [this.dragged.dataset["value"], next.dataset["value"]],
                        indices: [index - 1, index - 2],
                        order: this.order,
                    } }));
                return; // Not needed, but short-circuits in case we add any non-swapping logic later.
            }
        }
    }
}
function childIndex(child) {
    let i = 0;
    while ((child = child.previousElementSibling) !== null) {
        i++;
    }
    return i;
}
