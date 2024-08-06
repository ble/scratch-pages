import { TemplateDef, TemplatedHelpers } from './labels.js';
export class LayeredCanvases extends TemplatedHelpers {
    static template = new TemplateDef('layered-canvases', 'layered-canvases-template', `
<div style="position: relative">
</div>
`);
    get usesShadowDom() {
        return false;
    }
    getAttributeNames() {
        return ['width', 'height'];
    }
    getCanvas(layerName) {
        const canvas = this.root.querySelector(`canvas[data-layer-name="${layerName}"]`);
        if (canvas === null) {
            throw new Error(`Layer ${layerName} does not exist.`);
        }
        return canvas;
    }
    addCanvas(layerName) {
        if (this.root.querySelector(`canvas[data-layer-name="${layerName}"]`) !== null) {
            throw new Error(`Layer ${layerName} already exists.`);
        }
        const canvas = document.createElement('canvas');
        canvas.width = Number(this.getAttribute('width'));
        canvas.height = Number(this.getAttribute('height'));
        canvas.style.position = 'absolute';
        canvas.style.zIndex = `${this.#highestZIndex + 1}`;
        this.#highestZIndex++;
        canvas.dataset.layerName = layerName;
        const container = this.root.querySelector('div');
        if (container.childElementCount > 0) {
            container.insertBefore(canvas, container.children[0]);
        }
        else {
            container.appendChild(canvas);
        }
        return canvas;
    }
    bringToFront(...layerNames) {
        const frontNames = new Set(layerNames);
        const allCanvases = Array.from(this.root.querySelectorAll('canvas'));
        // Split all the canvases into those *not* chosen, that will go behind, and those chosen, that will go in front:
        // Canvases below, as an array:
        const canvasesBelow = allCanvases.filter(c => !frontNames.has(c.dataset.layerName));
        // Canvases above, as a map:
        const canvasesFront = new Map(allCanvases.filter(c => frontNames.has(c.dataset.layerName)).map(c => [c.dataset.layerName, c]));
        canvasesBelow.sort((a, b) => Number(a.style.zIndex) - Number(b.style.zIndex));
        // Compress z-index range of canvases below:
        const zBelow = canvasesBelow.length;
        for (let ix = 0; ix < canvasesBelow.length; ix++) {
            canvasesBelow[ix].style.zIndex = `${zBelow - ix}`;
        }
        const zAbove = zBelow + canvasesFront.size;
        for (let ix = 0; ix < canvasesFront.size; ix++) {
            canvasesFront.get(layerNames[ix]).style.zIndex = `${zAbove - ix}`;
        }
    }
    #byName = new Map();
    #highestZIndex = 0;
    constructor() {
        super();
        this.addCanvas('background');
    }
}
