import { TemplateDef, TemplatedHelpers } from "./labels.js";
import { TriangleGridKernel, angleToOrientation } from "./TriangleGrid.js";
export class GridSpec extends TemplatedHelpers {
    static template = new TemplateDef("grid-spec", "grid-spec-template", `
<div>
  <input type="checkbox" id="face-center">
  <label for="face-center">Face center at origin</label>
</div>
<div>
  <input type="range" id="spacing" min="15" max="150" value="120" step="1">
  <label for="spacing">Spacing:</label>
  <output for="spacing" id="spacing-output">90</output>
</div>
<div>
  <input type="range" id="pointing" min="-15" max="375" value="180" step="5">
  <label for="pointing">Pointing:</label>
  <output for="pointing" id="pointing-output">50</output>
</div>
`);
    static coercePointing(value) {
        if (value < 0) {
            value += 360;
        }
        else if (value >= 360) {
            value -= 360;
        }
        const newValue = value;
        return { orientation: angleToOrientation(value), newValue };
    }
    #grid = null;
    #updateGrid() {
        this.#grid = TriangleGridKernel.make(this.#offsetKind, this.#pointing, this.#spacing);
    }
    get() {
        if (this.#grid === null) {
            this.#updateGrid();
        }
        return this.#grid;
    }
    fireGridChanged() {
        this.#updateGrid();
        const event = new CustomEvent("grid-changed", {
            detail: this.get()
        });
        this.dispatchEvent(event);
    }
    #offsetKind = 'face-center-at-origin';
    #spacing = 15;
    #pointing = 'point-x';
    connectedCallback() {
        super.connectedCallback();
        const offsetInput = this.byId("face-center");
        const spacingInput = this.byId("spacing");
        const pointingInput = this.byId("pointing");
        const spacingOutput = this.byId("spacing-output");
        const pointingOutput = this.byId("pointing-output");
        this.#offsetKind = offsetInput.checked ? 'face-center-at-origin' : 'vertex-at-origin';
        this.#spacing = spacingInput.valueAsNumber;
        const { orientation } = GridSpec.coercePointing(pointingInput.valueAsNumber);
        this.#pointing = orientation;
        this.#updateGrid();
        const handleOffset = () => {
            this.#offsetKind = offsetInput.checked ? 'face-center-at-origin' : 'vertex-at-origin';
            this.fireGridChanged();
        };
        this.addOwnedEventListener(offsetInput, "change", handleOffset);
        const handleSpacing = () => {
            this.#spacing = spacingInput.valueAsNumber;
            spacingOutput.value = spacingInput.value;
            this.fireGridChanged();
        };
        this.addOwnedEventListener(spacingInput, "input", handleSpacing);
        const handlePointing = () => {
            const { orientation, newValue } = GridSpec.coercePointing(pointingInput.valueAsNumber);
            this.#pointing = orientation;
            pointingInput.valueAsNumber = newValue;
            pointingOutput.value = (typeof this.#pointing === 'string') ? this.#pointing : newValue.toString();
            this.fireGridChanged();
        };
        this.addOwnedEventListener(pointingInput, "input", handlePointing);
        handleOffset();
        handleSpacing();
        handlePointing();
    }
    disconnectedCallback() {
        this.removeAllOwnedListeners();
    }
    adoptedCallback() {
        throw new Error("Method `adoptedCallback` not implemented.");
    }
}
