import { Point2DWriter, Points2DFloatBacked } from "../Point2D.js";
import { TriangleGrid, vertices, edges, faces, adjacentVertices, adjacentFaces, adjacentEdges } from "../TriangleGrid.js";
import { pathCenteredSquare, pathLines, pathLoop, renderLineBandsWithinBounds, setupHiDPICanvas } from "../canvas_helpers.js";
import { mouseEventToLogicalCoordinates } from "../dom-helpers.js";
import { getGlobalLabels, setGlobalLabels } from "../labels.js";
import { AxisAlignedBoundingBox2D } from "../primitives.js";
import { zip } from "../util.js";
let clearValue, redrawCallback = null, redraw = () => {
    if (redrawCallback !== null) {
        redrawCallback();
    }
};
const gridSpec = document.querySelector("grid-spec");
gridSpec.addEventListener("grid-changed", redraw);
const clearInput = document.getElementById("clear");
function updateClear() {
    clearValue = clearInput.checked;
    redraw();
}
updateClear();
clearInput.addEventListener('input', updateClear);
const nearestMouse = document.getElementById("nearest-mouse");
function objectSelection() {
    return { nearestKind: nearestMouse.value };
}
const touchingOrAdjacent = document.getElementById("touching-or-adjacent");
function nearbySelection() {
    return touchingOrAdjacent.value;
}
const updateTouchingOrAdjacent = function () {
    const selectionKind = nearestMouse.value;
    const selectionKey = `showFor${selectionKind[0].toUpperCase() + selectionKind.substring(1)}`;
    let needsReselection = false;
    for (let option of touchingOrAdjacent.options) {
        if (selectionKey in option.dataset) {
            option.removeAttribute('hidden');
        }
        else {
            option.setAttribute('hidden', '');
            if (option.selected) {
                needsReselection = true;
            }
        }
        console.log(option, option.hidden);
    }
    if (!needsReselection) {
        return;
    }
    for (let option of touchingOrAdjacent.options) {
        if (!option.hidden) {
            touchingOrAdjacent.value = option.value;
            break;
        }
    }
};
updateTouchingOrAdjacent();
nearestMouse.addEventListener('input', updateTouchingOrAdjacent);
const drawCrossHairsInput = document.getElementById("draw-crosshairs");
function drawCrossHairs() {
    return drawCrossHairsInput.checked;
}
const drawGridInput = document.getElementById("draw-grid");
function drawGrid() {
    console.log(drawGridInput.checked);
    return drawGridInput.checked;
}
const canvas = document.getElementById("canvas");
const [ctx, bounds] = (setupHiDPICanvas(canvas, 'yUpCenterOrigin'));
const aabb = new AxisAlignedBoundingBox2D(-bounds.width / 2, bounds.width / 2, -bounds.width / 2, bounds.width / 2);
const scratchVertices = new Points2DFloatBacked(1024);
const scratchVertexArray = scratchVertices.arrayLike();
redrawCallback = () => {
    if (clearValue) {
        ctx.save();
        const style = window.getComputedStyle(document.body);
        ctx.fillStyle = style.backgroundColor;
        if (ctx.fillStyle === style.backgroundColor) {
            ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
        }
        else {
            ctx.clearRect(bounds.left, bounds.top, bounds.width, bounds.height);
        }
        ctx.restore();
    }
    scratchVertices.reset();
    const grid = gridSpec.get();
    if (drawGrid()) {
        let offset = scratchVertices.offset;
        for (let band of grid.bands) {
            renderLineBandsWithinBounds(band, aabb, scratchVertices);
        }
        ctx.beginPath();
        pathLines(ctx, scratchVertexArray, [offset, scratchVertices.offset]);
        ctx.stroke();
        let origin = scratchVertices.extend().setOrigin();
        let alongLineUnits = [];
        for (let ix = 0; ix < 3; ix++) {
            alongLineUnits.push(scratchVertices.extend().setUnitCircle(grid.normalAngles[ix] - Math.PI / 2).mulAssign(grid.bands[0].spacing / 2));
        }
        const colors = ['cyan', 'magenta', 'yellow'];
        ctx.save();
        for (let ix = 0; ix < 3; ix++) {
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(origin.x + alongLineUnits[ix].x, origin.y + alongLineUnits[ix].y);
            ctx.lineWidth *= 2;
            ctx.strokeStyle = colors[ix];
            ctx.stroke();
        }
        ctx.restore();
    }
};
redraw();
const labels = document.getElementById("my-labels");
setGlobalLabels(labels);
canvas.addEventListener('mousemove', (event) => {
    const logicalPoint = mouseEventToLogicalCoordinates(event.target, event, bounds);
    if (logicalPoint === null) {
        return;
    }
    redraw();
    if (scratchVertices.offset >= scratchVertices.capacity / 2) {
        scratchVertices.reset();
    }
    const offset = scratchVertices.offset;
    const kernel = gridSpec.get();
    const grid = new TriangleGrid(kernel.bands, kernel.normalAngles, kernel.bands[0].spacing);
    const labels = getGlobalLabels();
    const { nearestKind } = objectSelection();
    const selectedObject = grid.getNearest(nearestKind, logicalPoint);
    const squareSize = grid.bands[0].spacing / 2;
    labels.set("selected object", JSON.stringify(selectedObject));
    const verticesOffset = scratchVertices.offset;
    for (let vertexObject of vertices(selectedObject)) {
        grid.getPointAtOffset(vertexObject.index)(scratchVertices.extend());
    }
    ctx.beginPath();
    ctx.save();
    ctx.lineWidth *= 4;
    switch (nearestKind) {
        case 'face':
            ctx.strokeStyle = "rgb(0,128,128)";
            ctx.fillStyle = "cyan";
            break;
        case 'vertex':
            ctx.fillStyle = "rgb(128,0,128)";
            ctx.strokeStyle = "magenta";
            break;
        case 'edge':
            ctx.fillStyle = "rgb(128,128,0)";
            ctx.strokeStyle = "yellow";
            break;
    }
    switch (nearestKind) {
        case 'face':
            pathLoop(ctx, scratchVertexArray, [verticesOffset, scratchVertices.offset]);
            ctx.closePath();
            ctx.fill();
            break;
        case 'vertex':
            for (let ix = verticesOffset; ix < scratchVertices.offset; ix++) {
                pathCenteredSquare(ctx, scratchVertexArray[ix], 10);
            }
            ctx.fill();
            ctx.stroke();
            break;
        case 'edge':
            pathLines(ctx, scratchVertexArray, [verticesOffset, scratchVertices.offset]);
            ctx.stroke();
    }
    ctx.restore();
    const grabSlice = function (a, [start, stop]) {
        const result = [];
        for (let ix = start; ix < stop; ix++) {
            result.push(a[ix]);
        }
        return result;
    };
    labels.set("object vertices", JSON.stringify(grabSlice(scratchVertexArray, [verticesOffset, scratchVertices.offset])));
    const touchingOrAdjacent = nearbySelection();
    if (touchingOrAdjacent === 'none') {
        return;
    }
    let secondaryIndex = scratchVertices.offset;
    switch (touchingOrAdjacent) {
        case 'vertices':
            ctx.beginPath();
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.lineWidth *= 12;
            ctx.strokeStyle = "green";
            ctx.fillStyle = "rgb(0,128,0)";
            for (let vertex of vertices(selectedObject)) {
                grid.getPointAtOffset(vertex.index)(scratchVertices.extend());
            }
            ctx.beginPath();
            for (let ix = secondaryIndex; ix < scratchVertices.offset; ix++) {
                pathCenteredSquare(ctx, scratchVertexArray[ix], 10);
            }
            ctx.stroke();
            ctx.fill();
            ctx.restore();
            break;
        case 'adjacent-vertices':
            if (selectedObject.type != 5) {
                throw new Error("Expected a vertex");
            }
            ctx.beginPath();
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.lineWidth *= 12;
            ctx.strokeStyle = "green";
            ctx.fillStyle = "rgb(0,128,0)";
            for (let vertex of adjacentVertices(selectedObject)) {
                grid.getPointAtOffset(vertex.index)(scratchVertices.extend());
            }
            ctx.beginPath();
            for (let ix = secondaryIndex; ix < scratchVertices.offset; ix++) {
                pathCenteredSquare(ctx, scratchVertexArray[ix], 10);
            }
            ctx.stroke();
            ctx.fill();
            ctx.restore();
            break;
        case 'adjacent-faces':
            if (selectedObject.type != 3 && selectedObject.type != 4) {
                throw new Error("Expected a face");
            }
            ctx.beginPath();
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.lineWidth *= 12;
            ctx.strokeStyle = "red";
            ctx.fillStyle = "rgb(128,0,0)";
            for (let face of adjacentFaces(selectedObject)) {
                for (let vertex of vertices(face)) {
                    grid.getPointAtOffset(vertex.index)(scratchVertices.extend());
                }
            }
            for (let ix = secondaryIndex; ix < scratchVertices.offset - 2; ix += 3) {
                pathLoop(ctx, scratchVertexArray, [ix, ix + 3]);
            }
            ctx.fill();
            ctx.restore();
            break;
        case 'adjacent-edges':
            if (selectedObject.type != 0 && selectedObject.type != 1 && selectedObject.type != 2) {
                throw new Error("Expected an edge");
            }
            ctx.beginPath();
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.lineWidth *= 12;
            ctx.strokeStyle = 'blue';
            ctx.fillStyle = 'rgb(0,0,128)';
            for (let edge of adjacentEdges(selectedObject)) {
                for (let vertex of vertices(edge)) {
                    grid.getPointAtOffset(vertex.index)(scratchVertices.extend());
                }
            }
            pathLines(ctx, scratchVertexArray, [secondaryIndex, scratchVertices.offset]);
            ctx.stroke();
            ctx.fill();
            ctx.restore();
            break;
        case 'edges':
            ctx.beginPath();
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.lineWidth *= 12;
            ctx.strokeStyle = 'blue';
            ctx.fillStyle = 'rgb(0,0,128)';
            for (let edge of edges(selectedObject)) {
                for (let vertex of vertices(edge)) {
                    grid.getPointAtOffset(vertex.index)(scratchVertices.extend());
                }
            }
            pathLines(ctx, scratchVertexArray, [secondaryIndex, scratchVertices.offset]);
            ctx.stroke();
            ctx.fill();
            ctx.restore();
            break;
        case 'faces':
            ctx.beginPath();
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = 'rgb(128,0,0)';
            for (let face of faces(selectedObject)) {
                for (let vertex of vertices(face)) {
                    grid.getPointAtOffset(vertex.index)(scratchVertices.extend());
                }
            }
            for (let ix = secondaryIndex; ix < scratchVertices.offset - 2; ix += 3) {
                pathLoop(ctx, scratchVertexArray, [ix, ix + 3]);
            }
            ctx.fill();
            ctx.restore();
            break;
    }
    // const selectedVertex = centerPoint(grid, selectedObject)(scratchVertices.extend());
    // ctx.beginPath();
    // pathCenteredSquare(ctx, selectedVertex, 10);
    // ctx.save();
    // switch(nearestKind) {
    //   case 'face':
    //     ctx.fillStyle = "red";
    //     break;
    //   case 'vertex':
    //     ctx.fillStyle = "green";
    //     break;
    //   case 'edge':
    //     ctx.fillStyle = "blue";
    //     break;
    // }
    // ctx.fill();
    // ctx.restore();
    const mousePointOffsets = grid.getGridIndices(logicalPoint);
    const crossHairOffset = scratchVertices.offset;
    if (drawCrossHairs()) {
        for (let [band, k] of zip(grid.bands, mousePointOffsets)) {
            Point2DWriter.write(aabb.clipLine(band.kthLine(k)), scratchVertices);
        }
        ctx.beginPath();
        pathLines(ctx, scratchVertexArray, [crossHairOffset, scratchVertices.offset]);
        ctx.save();
        ctx.lineWidth /= 4;
        ctx.strokeStyle = "black";
        ctx.stroke();
        ctx.restore();
    }
    labels.render();
});
