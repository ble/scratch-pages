import { Point2DWriter, Points2DFloatBacked, write } from "../Point2D.js";
import { TriangleGrid, TriangleGridKernel, angleToOrientation, bigTypeianScheme, centerKs, orientationToAngle } from "../TriangleGrid.js";
import { renderLineBandsWithinBounds, pathLines, pathLoop, pathCenteredSquare } from "../canvas_helpers.js";
import { setupHiDPICanvas } from "../canvas_helpers.js";
import { LineBands, AxisAlignedBoundingBox2D } from "../primitives.js";
import { getContentWidthAndHeight, parity, roundToMultiple } from "../util.js";
function drawDemo(ctx, clearCanvas, bounds, offsetKind, pointing, spacing) {
    if (clearCanvas) {
        ctx.clearRect(bounds.left, bounds.top, bounds.width, bounds.height);
    }
    // Draw a red rectangle around the bounds of the canvas:
    ctx.beginPath();
    ctx.rect(bounds.left, bounds.bottom, bounds.width, bounds.height);
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.stroke();
    ctx.restore();
    // Draw a blue cross through the origin:
    ctx.save();
    ctx.strokeStyle = 'blue';
    ctx.moveTo(0, bounds.bottom);
    ctx.lineTo(0, bounds.top);
    ctx.moveTo(bounds.left, 0);
    ctx.lineTo(bounds.right, 0);
    ctx.stroke();
    ctx.restore();
    // Create the kernel of the triangle
    const exampleKernel = TriangleGridKernel.make(offsetKind, pointing, spacing);
    window.exampleKernel = exampleKernel;
    const scratchVertices = new Points2DFloatBacked(16384);
    let lastOffset = scratchVertices.offset;
    const drawZeroOffsetGrid = false;
    if (drawZeroOffsetGrid) {
        // Render (into points in a buffer) then draw (onto the canvas) sets of parallel
        // lines with the same normals and spacing, but 0 offset, which will not be the
        // same as the parallel line sets of the grid kernel for some parameters.
        const bands = exampleKernel.normals.map((normal, ix) => new LineBands(normal, 0, spacing));
        for (let band of bands) {
            renderLineBandsWithinBounds(band, aabb, scratchVertices);
        }
        ctx.beginPath();
        const lineVertices = scratchVertices.arrayLike;
        pathLines(ctx, lineVertices, [lastOffset, scratchVertices.offset]);
        ctx.save();
        ctx.lineWidth /= 4;
        ctx.stroke();
        ctx.restore();
    }
    // Render into points, then draw onto the canvas, the parallel line sets of the
    // grid kernel, each with a different color.
    lastOffset = scratchVertices.offset;
    const halfSpaceBand = exampleKernel.bands[0], halfSpaceBand2 = exampleKernel.bands[1], halfSpaceBand3 = exampleKernel.bands[2];
    renderLineBandsWithinBounds(halfSpaceBand, aabb, scratchVertices);
    ctx.beginPath();
    pathLines(ctx, scratchVertices.arrayLike, [lastOffset, scratchVertices.offset]);
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.stroke();
    ctx.restore();
    lastOffset = scratchVertices.offset;
    renderLineBandsWithinBounds(halfSpaceBand2, aabb, scratchVertices);
    ctx.beginPath();
    pathLines(ctx, scratchVertices.arrayLike, [lastOffset, scratchVertices.offset]);
    ctx.save();
    ctx.strokeStyle = 'purple';
    ctx.stroke();
    ctx.restore();
    lastOffset = scratchVertices.offset;
    ctx.beginPath();
    renderLineBandsWithinBounds(halfSpaceBand3, aabb, scratchVertices);
    pathLines(ctx, scratchVertices.arrayLike, [lastOffset, scratchVertices.offset]);
    ctx.save();
    ctx.strokeStyle = 'orange';
    ctx.stroke();
    ctx.restore();
    // Render and draw "face 0" from first principles.
    lastOffset = scratchVertices.offset;
    ctx.beginPath();
    // The center of "face 0" is either the origin or (r, θ) = (2/3 * spacing, pointing + π).
    const thetaOrientation = orientationToAngle(pointing);
    // console.log("thetaOrientation:", (thetaOrientation * 180 / Math.PI));
    const faceCenter = (offsetKind == 'face-center-at-origin') ? write(0, 0) : (point) => { return point.setPolar(2 * spacing / 3, thetaOrientation + Math.PI); };
    // The vertices of a (origin-centered) face 0 are an equilateral triangle with:
    // - radius from center to vertex of (2/3) * spacing
    // - angles that are the opposite of the normals of the grid kernel.
    faceCenter(scratchVertices.extend()).addPolar(2 * spacing / 3, exampleKernel.normalAngles[0] + Math.PI);
    faceCenter(scratchVertices.extend()).addPolar(2 * spacing / 3, exampleKernel.normalAngles[1] + Math.PI);
    faceCenter(scratchVertices.extend()).addPolar(2 * spacing / 3, exampleKernel.normalAngles[2] + Math.PI);
    ctx.beginPath();
    pathLoop(ctx, scratchVertices.arrayLike, [lastOffset, scratchVertices.offset]);
    ctx.save();
    // A thick yellowish-green highlight.
    ctx.strokeStyle = 'rgba(128, 255, 64, 0.8)';
    ctx.lineWidth *= 4;
    ctx.stroke();
    ctx.restore();
    // Draw squares centered on the vertices of face 0 as calculated by the kernel.
    ctx.beginPath();
    pathCenteredSquare(ctx, exampleKernel.face0Vertices[0], 16);
    pathCenteredSquare(ctx, exampleKernel.face0Vertices[1], 16);
    pathCenteredSquare(ctx, exampleKernel.face0Vertices[2], 16);
    ctx.fillStyle = 'yellow';
    ctx.fill();
    ctx.stroke();
    window.exampleKernel = exampleKernel;
    // Highlight the lines from the parallel line set that bound face 0.
    lastOffset = scratchVertices.offset;
    const boundsAndK = [[0, 1], [1, 0], [2, 0]];
    for (let [bix, k] of boundsAndK) {
        const [w1, w2] = (aabb.clipLine(exampleKernel.bands[bix].kthLine(k)));
        Point2DWriter.write([w1, w2], scratchVertices);
    }
    ctx.beginPath();
    pathLines(ctx, scratchVertices.arrayLike, [lastOffset, scratchVertices.offset]);
    ctx.save();
    ctx.lineWidth *= 16;
    ctx.strokeStyle = 'rgba(0,255,255,0.25)';
    ctx.stroke();
    ctx.restore();
    // Fill a green square centered on the center of face 0.
    ctx.beginPath();
    pathCenteredSquare(ctx, exampleKernel.centerOfFace0, 16);
    ctx.save();
    ctx.fillStyle = 'green';
    ctx.fill();
    ctx.restore();
}
const canvas = document.getElementById("canvas");
if (canvas === null) {
    throw new Error("Could not find canvas.");
}
// Set up a canvas which takes up as many "logical" pixels as are specified by
// the canvas element's width and height attributes, but which has a pixel density
// scaled by window.devicePixelRatio.
// `bounds` contains the bounding box of the canvas in logical coordinates.
const [ctx, bounds] = (setupHiDPICanvas(canvas, 'yUpCenterOrigin'));
const aabb = new AxisAlignedBoundingBox2D(-bounds.width / 2, bounds.width / 2, -bounds.width / 2, bounds.width / 2);
console.log("The bounds of the logical drawing space:", bounds);
let offsetKindValue, spacingValue, pointingValue, newPointingValue, clearValue;
const redraw = function () {
    drawDemo(ctx, clearValue, bounds, offsetKindValue, pointingValue, spacingValue);
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
function getContentBoxOffsets(element) {
    const style = window.getComputedStyle(element);
    function extractPx(value) {
        return value.endsWith('px') ? parseFloat(value.substring(0, value.length - 2)) : 0;
    }
    const borderLeft = extractPx(style.borderLeftWidth), borderTop = extractPx(style.borderTopWidth), borderRight = extractPx(style.borderRightWidth), borderBottom = extractPx(style.borderBottomWidth), paddingLeft = extractPx(style.paddingLeft), paddingTop = extractPx(style.paddingTop), paddingRight = extractPx(style.paddingRight), paddingBottom = extractPx(style.paddingBottom);
    return {
        'left': borderLeft + paddingLeft,
        'top': borderTop + paddingTop,
        'right': borderRight + paddingRight,
        'bottom': borderBottom + paddingBottom
    };
}
function getScalingDOMMatrix(element) {
    const style = window.getComputedStyle(element);
    let transform = new DOMMatrix(style.transform);
    transform.e = 0;
    transform.f = 0;
    return transform;
}
function memoizedOnElement(element, key, fn) {
    const untyped = element;
    if (key in untyped) {
        return untyped[key];
    }
    const value = fn(element);
    untyped[key] = value;
    return value;
}
function offsetToContentCoords(offset, target, elementRect) {
    let contentX = target.x - offset.x, contentY = target.y - offset.y;
    // TODO: actually consider (border + padding) left as well as right, top as well as bottom,
    // instead of assuming that left == right and top == bottom.
    if (contentX < 0 || contentX > (elementRect.width - 2 * offset.x) || contentY < 0 || contentY > (elementRect.height - 2 * offset.y)) {
        return null;
    }
    return new DOMPoint(contentX, contentY);
}
const labels = document.getElementById("my-labels");
const canvasLogicalBounds = bounds;
canvas.addEventListener('mousemove', function (e) {
    const event = e;
    const targetElement = event.target;
    labels.set("mouse move pixels", [event.offsetX, event.offsetY]);
    const boxOffsets = memoizedOnElement(targetElement, 'contentBoxOffsets', getContentBoxOffsets);
    const transform = memoizedOnElement(targetElement, 'inverseScalingDOMMatrix', getScalingDOMMatrix);
    const targetPoint_pre = new DOMPoint(event.offsetX, event.offsetY);
    const targetPoint = targetPoint_pre.matrixTransform(transform);
    const offsetPoint_pre = new DOMPoint(boxOffsets.left, boxOffsets.top);
    const offsetPoint = offsetPoint_pre.matrixTransform(transform);
    const clientRect = targetElement.getBoundingClientRect();
    // console.log("client rect dimensions", {width: clientRect.width, height: clientRect.height})
    const contentCoords_post = offsetToContentCoords(offsetPoint, targetPoint, clientRect);
    const contentCoords = contentCoords_post?.matrixTransform(transform.inverse());
    if (contentCoords !== undefined) {
        labels.set("content coords", [contentCoords.x, contentCoords.y]);
    }
    else {
        // console.log("outside content");
        return;
    }
    if (targetElement instanceof HTMLCanvasElement) {
        const { width, height } = getContentWidthAndHeight(targetElement);
        const relX = contentCoords.x / width, relY = (1.0 - contentCoords.y / height); // <--- hack to handle "flipped" y-axis
        // TODO: could we actually use the canvas transform itself to assist us?
        // Is there some step here where we ***should*** be using the canvas transform instead
        // of the CSS transform?
        const logicalPoint = new DOMPoint(canvasLogicalBounds.left + relX * canvasLogicalBounds.width, canvasLogicalBounds.top + relY * canvasLogicalBounds.height);
        labels.set("logical coords", JSON.stringify([logicalPoint.x, logicalPoint.y]));
        const kLineVertices = new Points2DFloatBacked(64);
        const kLineOffset = [kLineVertices.offset, NaN];
        const kernel = window.exampleKernel;
        const grid = new TriangleGrid(kernel.bands, kernel.normalAngles, kernel.bands[0].spacing);
        const ksContinuous = grid.getGridIndices(logicalPoint);
        const ks = ksContinuous.map(Math.floor);
        // console.log("k indices:", ks.map(Math.floor));
        const lines = ksContinuous.map((k, ix) => grid.bands[ix].kthLine(k));
        for (let line of lines) {
            const [p, q] = (aabb.clipLine(line));
            Point2DWriter.write([p, q], kLineVertices);
        }
        kLineOffset[1] = kLineVertices.offset;
        const adjacentFaceCenters = [];
        const faceCenter = grid.getFaceCenterNearestPoint(logicalPoint)(kLineVertices.extend());
        labels.set("X and Y position (pixels) of face center", [faceCenter.x, faceCenter.y].map(Math.round));
        //console.log("face center:", faceCenter.x, faceCenter.y);
        let faceCenterGridIndices = grid.getGridIndices(faceCenter);
        labels.set("Grid offsets (spacings) of face center", faceCenterGridIndices.map(x => roundToMultiple(x, 1e-2)));
        let fi = grid.getFaceIndexNearestPoint(faceCenter);
        labels.set("Face index of face center", fi);
        let faceParity = parity(fi);
        const faceCenterObject = { type: 3 + faceParity, index: fi };
        let centerIndex = centerKs(faceCenterObject);
        let bisectorsObjects = (faceParity == 1) ? ([
            { type: 0, index: fi },
            { type: 1, index: fi },
            { type: 2, index: fi }
        ]) : ([
            { type: 0, index: [fi[0] + 1, fi[1], fi[2]] },
            { type: 1, index: [fi[0], fi[1] + 1, fi[2]] },
            { type: 2, index: [fi[0], fi[1], fi[2]] }
        ]);
        let bisectorsOffsets = bisectorsObjects.map(centerKs);
        labels.set("Edge bisector offsets", JSON.stringify(bisectorsOffsets));
        const bisectors = Point2DWriter.writeWithRefs(bisectorsOffsets.map((o) => grid.getPointAtOffset(o)), kLineVertices);
        labels.set("face center grid indices", faceCenterGridIndices);
        // console.log("center index from call to `centerKs`:", centerIndex);
        let delta = [0, 1, 2].map(ix => roundToMultiple(faceCenterGridIndices[ix] - centerIndex[ix], 1e-6));
        labels.set("delta", delta);
        // console.log("face center grid index sum:", roundToMultiple(faceCenterGridIndices.reduce((a, b) => a + b, 0), 0.00001));
        for (let adjacentIndex of TriangleGrid.getAdjacentFaceIndices(ks)) {
            adjacentFaceCenters.push(grid.getNearestFaceCenter(adjacentIndex)(kLineVertices.extend()));
        }
        labels.set("face center concise index", bigTypeianScheme.getIndex(faceCenterObject).toString(16));
        bisectorsObjects.forEach((o, ix) => {
            labels.set(`bisector ${ix} concise index`, bigTypeianScheme.getIndex(o).toString(16));
        });
        const kFaceCenter = grid.bands.map(band => roundToMultiple(band.kForPoint(faceCenter), 0.01));
        // console.log("k indices for vertex:", kFaceCenter.map(x => roundToMultiple(x, 0.01)));
        // console.log("k delta:", roundToMultiple(kFaceCenter[0] + kFaceCenter[1] + kFaceCenter[2], 0.01));
        const faceVertices = Point2DWriter.writeWithRefs(grid.getFaceVertices(ks), kLineVertices);
        redraw();
        ctx.beginPath();
        pathCenteredSquare(ctx, bisectors[0], 4);
        pathCenteredSquare(ctx, bisectors[1], 4);
        pathCenteredSquare(ctx, bisectors[2], 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.save();
        ctx.lineWidth /= 8;
        pathLines(ctx, kLineVertices.arrayLike, kLineOffset);
        ctx.stroke();
        ctx.restore();
        ctx.beginPath();
        pathCenteredSquare(ctx, faceCenter, 16);
        for (let adjacentFaceCenter of adjacentFaceCenters) {
            pathCenteredSquare(ctx, adjacentFaceCenter, 16);
        }
        for (let vertex of faceVertices) {
            ctx.moveTo(vertex.x + 8, vertex.y);
            ctx.arc(vertex.x, vertex.y, 8, 0, 2 * Math.PI);
        }
        ctx.stroke();
        labels.render();
    }
});
