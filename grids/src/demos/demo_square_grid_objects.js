import { Point2DWriter, Points2DFloatBacked } from "../Point2D.js";
import { pathLines, setupHiDPICanvas } from "../canvas_helpers.js";
import { mouseEventToLogicalCoordinates, outputForElement } from "../dom-helpers.js";
import { getGlobalLabels } from "../labels.js";
import { AxisAlignedBoundingBox2D } from "../primitives.js";
// import { EdgeBrush, FaceBrush, GridEdge, GridFace, GridVertex, ISquareGrid, ISquareGridObject, SquareGrid, VertexBrush, canonicalSquareGrid } from "../square_grid.js";
import { EdgeBrush, FaceBrush, VertexBrush } from "../square_grid.js";
// Can switch between triangular and square grids by changing which one of the following lines is commented out:
//import { SquareGrid as Grid, ISquareGrid as IGrid, ISquareGridObject as IGridObject, canonicalSquareGrid as canonicalGrid } from "../square_grid.js";
import { TriangleGrid as Grid, canonicalTriangleGrid as canonicalGrid } from "../triangle_grid.js";
function kebabToCamelCase(str) {
    return str.replace(/-./g, (match) => match.charAt(1).toUpperCase());
}
function bindElementsById(ids) {
    return Object.fromEntries(ids.map((id) => [kebabToCamelCase(id), document.getElementById(id)]));
}
function bindUI() {
    const inputIds = [
        'spacing',
        'rotation',
        'clear',
        'draw-crosshairs',
        'draw-grid',
    ];
    const selectIds = [
        'primary-selection',
        'secondary-selection'
    ];
    return [bindElementsById(inputIds), bindElementsById(selectIds)];
}
const [{ spacing, rotation, clear, drawCrosshairs, drawGrid }, { primarySelection, secondarySelection }] = bindUI();
window.ui = bindUI();
let redraw = () => { };
let theGrid = canonicalGrid;
const spacingOutput = outputForElement(spacing);
const rotationOutput = outputForElement(rotation);
function onGridChanged() {
    const spacingValue = parseInt(spacing.value);
    const rotationValue = parseInt(rotation.value);
    spacingOutput.innerText = spacingValue.toString();
    rotationOutput.innerText = rotationValue.toString();
    theGrid = Grid.create(spacingValue, rotationValue, null, 'degrees');
    // (window as any).theGrid = theGrid;
    // (window as any).Standalone = Standalone;
    // (window as any).canonicalGrid = canonicalGrid;
    redraw();
}
spacing.addEventListener('input', onGridChanged);
rotation.addEventListener('input', onGridChanged);
onGridChanged();
function onDrawChanged() {
    // do something
    redraw();
}
clear.addEventListener('change', onDrawChanged);
drawCrosshairs.addEventListener('change', onDrawChanged);
drawGrid.addEventListener('change', onDrawChanged);
(function () {
    let ix = 0;
    for (let option of secondarySelection.options) {
        option.dataset.optionOrder = ix.toString();
        ix++;
    }
})();
const disabledSelectOptions = document.createElement('select');
disabledSelectOptions.style.display = 'none';
secondarySelection.insertAdjacentElement('afterend', disabledSelectOptions);
const updateSecondarySelectOptions = function () {
    const selectionKind = primarySelection.value;
    const selectionKey = `showFor${selectionKind[0].toUpperCase() + selectionKind.substring(1)}`;
    const allOptions = Array.from(secondarySelection.options).concat(Array.from(disabledSelectOptions.options));
    allOptions.sort((a, b) => {
        return Number.parseInt(a.dataset.optionOrder) - Number.parseInt(b.dataset.optionOrder);
    });
    let needsReselection = false;
    for (let option of allOptions) {
        if (selectionKey in option.dataset) {
            secondarySelection.insertAdjacentElement('beforeend', option);
        }
        else {
            if (option === secondarySelection.options[secondarySelection.selectedIndex]) {
                needsReselection = true;
            }
            disabledSelectOptions.insertAdjacentElement('beforeend', option);
        }
    }
    if (needsReselection) {
        secondarySelection.selectedIndex = 0;
    }
};
updateSecondarySelectOptions();
primarySelection.addEventListener('change', updateSecondarySelectOptions);
secondarySelection.addEventListener('input', () => redraw());
// Set up the canvas, its HiDPI context and bounds, and an AABB matching the bounds:
const canvas = document.getElementById('canvas');
const [ctx, bounds] = setupHiDPICanvas(canvas, 'yUpCenterOrigin');
const aabb = new AxisAlignedBoundingBox2D(-bounds.width / 2, bounds.width / 2, -bounds.height / 2, bounds.height / 2);
const vertexBuffer = new Points2DFloatBacked(8192);
function backgroundColor() {
    ctx.save();
    const style = window.getComputedStyle(document.body);
    let result;
    ctx.fillStyle = style.backgroundColor;
    if (ctx.fillStyle === style.backgroundColor) {
        result = ctx.fillStyle;
    }
    else {
        result = null;
    }
    ctx.restore();
    return result;
}
let lastLogicalPoint = null;
let lastGridObject = null;
redraw = () => {
    if (clear.checked) {
        const color = backgroundColor();
        if (color != null) {
            ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
        }
        else {
            ctx.clearRect(bounds.left, bounds.top, bounds.width, bounds.height);
        }
    }
    vertexBuffer.reset();
    if (lastGridObject !== null) {
        lastGridObject.grid = theGrid;
        const brush = brushes[lastGridObject.kind];
        brush.style = primaryStyle;
        if ('verticesPerFace' in brush && lastGridObject.kind === 'face') {
            brush.verticesPerFace = lastGridObject.nVertices();
        }
        const offsetStart = vertexBuffer.offset;
        gridObjectsIntoVertices(vertexBuffer, lastGridObject);
        brush.draw(ctx, vertexBuffer.arrayLike(offsetStart, vertexBuffer.offset));
        if (secondarySelection.value !== 'nothing') {
            let { objects, brush } = secondaryObjectsAndBrush(lastGridObject, secondarySelection.value);
            const offsetStart = vertexBuffer.offset;
            gridObjectsIntoVertices(vertexBuffer, ...objects);
            brush.style = secondaryStyle;
            brush.draw(ctx, vertexBuffer.arrayLike(offsetStart, vertexBuffer.offset));
        }
    }
    if (drawGrid.checked) {
        const gridStartOffset = vertexBuffer.offset;
        Point2DWriter.write(theGrid.gridLinesInside(aabb), vertexBuffer);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.beginPath();
        pathLines(ctx, vertexBuffer.arrayLike(), [gridStartOffset, vertexBuffer.offset]);
        ctx.stroke();
        ctx.restore();
    }
    if (lastLogicalPoint !== null && drawCrosshairs.checked) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        drawCrossHairsAtPoint(lastLogicalPoint);
        ctx.restore();
    }
    //getGlobalLabels().render();
};
function secondaryObjectsAndBrush(primaryObject, selectionKind) {
    let objects = [], brush = null;
    if (selectionKind == 'vertices' || selectionKind == 'edges' || selectionKind == 'faces') {
        for (let o of primaryObject[selectionKind]()) {
            objects.push(o);
        }
        brush = brushes[selectionKind];
        // TODO: just a hack / assumed that the # of vertices per face is constant.
    }
    else {
        switch (selectionKind) {
            case 'adjacent-vertices':
                if (primaryObject.kind !== "vertex") {
                    throw new Error("mismatched object and secondary selection");
                }
                objects = Array.from(primaryObject.adjacentVertices());
                brush = brushes['vertices'];
                break;
            case 'adjacent-edges':
                if (primaryObject.kind !== "edge") {
                    throw new Error("mismatched object and secondary selection");
                }
                objects = Array.from(primaryObject.adjacentEdges());
                brush = brushes['edges'];
                break;
            case 'adjacent-faces':
                if (primaryObject.kind !== "face") {
                    throw new Error("mismatched object and secondary selection");
                }
                objects = Array.from(primaryObject.adjacentFaces());
                brush = brushes['faces'];
                break;
            default:
                throw new Error("bad secondary selection");
        }
    }
    if ('verticesPerFace' in brush && objects.length > 0) {
        brush.verticesPerFace = objects[0].nVertices();
    }
    return { objects, brush };
}
function drawCrossHairsAtPoint(point) {
    const indices = theGrid.getFullIndices(point);
    const vertexOffset = vertexBuffer.offset;
    for (let line of theGrid.gridLinesThrough(indices)) {
        let points = aabb.clipLine(line);
        if (points === null) {
            continue;
        }
        Point2DWriter.write(points, vertexBuffer);
    }
    ctx.save();
    ctx.beginPath();
    pathLines(ctx, vertexBuffer.arrayLike(), [vertexOffset, vertexBuffer.offset]);
    ctx.stroke();
    ctx.restore();
}
const brushes = {
    vertex: new VertexBrush(() => Math.max(1, Number.parseFloat(spacing.value) / 5)),
    vertices: new VertexBrush(() => Math.max(1, Number.parseFloat(spacing.value) / 5)),
    edge: new EdgeBrush(),
    edges: new EdgeBrush(),
    face: new FaceBrush(),
    faces: new FaceBrush(),
};
const primaryStyle = (c) => {
    c.fillStyle = 'black';
    c.strokeStyle = 'red';
    c.lineWidth = Math.max(1, Number.parseFloat(spacing.value) / 20);
    c.lineCap = 'round';
    c.lineJoin = 'round';
}, secondaryStyle = (c) => {
    c.globalCompositeOperation = 'destination-over';
    c.fillStyle = 'white';
    c.strokeStyle = 'cyan';
    c.lineWidth = Math.max(1, Number.parseFloat(spacing.value) / 10);
    c.lineCap = 'round';
    c.lineJoin = 'round';
};
function gridObjectsIntoVertices(buffer, ...objects) {
    for (let obj of objects) {
        for (let vertex of obj.vertices()) {
            vertex.point()(buffer.extend());
        }
    }
}
let mouseIsDown = false;
function mouseMove(e) {
    const logicalPoint = mouseEventToLogicalCoordinates(e.target, e, bounds);
    if (mouseIsDown && logicalPoint == null) {
        lastGridObject = null;
    }
    if (logicalPoint === null) {
        return;
    }
    lastLogicalPoint = logicalPoint;
    if (mouseIsDown) {
        lastGridObject = theGrid.getNearest(primarySelection.value, lastLogicalPoint);
        getGlobalLabels().set('lastGridObject', JSON.stringify({ kind: lastGridObject.kind, type: lastGridObject.type, index: lastGridObject.index }));
        getGlobalLabels().render();
    }
    redraw();
}
function mouseUp(e) {
    lastLogicalPoint = null;
    mouseIsDown = false;
}
function mouseDown(e) {
    mouseIsDown = true;
    mouseMove(e);
}
canvas.addEventListener('mousedown', mouseDown);
canvas.addEventListener('mousemove', mouseMove);
window.addEventListener('mouseup', mouseUp);
redraw();
