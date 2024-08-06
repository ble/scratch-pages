import { angleToOrientation } from "../TriangleGrid.js";
let offsetKindValue, spacingValue, pointingValue, newPointingValue, clearValue, redrawCallback = null, redraw = () => {
    if (redrawCallback !== null) {
        redrawCallback();
    }
};
const offsetKindInput = document.getElementById("face-center");
function updateOffsetKind() {
    offsetKindValue = offsetKindInput.checked ? 'face-center-at-origin' : 'vertex-at-origin';
    redraw();
}
offsetKindValue = offsetKindInput.checked ? 'face-center-at-origin' : 'vertex-at-origin';
offsetKindInput.addEventListener('input', updateOffsetKind);
const spacingInput = document.getElementById("spacing");
const spacingOutput = document.getElementById("spacing-output");
spacingValue = spacingInput.valueAsNumber;
function updateSpacing() {
    spacingValue = spacingInput.valueAsNumber;
    spacingOutput.value = spacingInput.value;
    redraw();
}
spacingInput.addEventListener('input', updateSpacing);
function coercePointing(value) {
    if (value < 0) {
        value += 360;
    }
    else if (value >= 360) {
        value -= 360;
    }
    const newValue = value;
    return { orientation: angleToOrientation(value), newValue };
}
const pointingInput = document.getElementById("pointing");
const pointingOutput = document.getElementById("pointing-output");
pointingValue = coercePointing(pointingInput.valueAsNumber).orientation;
function updatePointing() {
    const { orientation, newValue } = coercePointing(pointingInput.valueAsNumber);
    pointingValue = orientation;
    newPointingValue = newValue;
    pointingOutput.value = (typeof pointingValue == 'string') ? pointingValue : JSON.stringify([pointingValue[0], Math.round(pointingValue[1] * 180 / Math.PI)]);
    pointingInput.valueAsNumber = newPointingValue;
    redraw();
}
updatePointing();
pointingInput.addEventListener('input', updatePointing);
const clearInput = document.getElementById("clear");
function updateClear() {
    clearValue = clearInput.checked;
    redraw();
}
updateClear();
clearInput.addEventListener('input', updateClear);
