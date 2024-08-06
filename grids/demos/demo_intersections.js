import { AABB, Line, LineBands } from "../primitives.js";
import { Points2DFloatBacked, Standalone } from "../Point2D.js";
import { cartesian, choose2, enumerate, range } from "../util.js";
import { setupHiDPICanvas } from "../canvas_helpers.js";
const canvas = document.getElementById("canvas");
if (canvas === null) {
    throw new Error("Could not find canvas.");
}
// Set up a canvas which takes up as many "logical" pixels as are specified by
// the canvas element's width and height attributes, but which has a pixel density
// scaled by window.devicePixelRatio.
// `bounds` contains the bounding box of the canvas in logical coordinates.
const [ctx, bounds] = (setupHiDPICanvas(canvas, 'yUpCenterOrigin'));
console.log("The bounds of the logical drawing space:", bounds);
// Set up the normal directions of the line bands that generate our grid:
const directions = new Points2DFloatBacked(3);
directions.extend().setUnitCircle(0);
directions.extend().setUnitCircle((2 * Math.PI) / 3);
directions.extend().setUnitCircle((2 * Math.PI) * 2 / 3);
// Create the line bands with each direction having the same spacing:
const bands = [];
for (let direction of directions) {
    const band = new LineBands(direction, 0, 45);
    bands.push(band);
}
// Create a buffer of vertices to populate with points on the grid lines;
// also store the offset of each line in the buffer according to which band
// and which value of k it is.
const lineVertices = new Points2DFloatBacked(16384);
const box = new AABB(bounds.left, bounds.right, bounds.top, bounds.bottom);
// We'll use the JSON representation of [bandIx, k] as the key for the offset.
//const offsetOfLines: Map<[number, number], number> = new Map();
const offsetOfLines = new Map();
for (let [bandIx, band] of enumerate(bands)) {
    // Determine the range of k values for which the line is in the box:
    const [k0, k1] = band.kRangeForBox(box);
    for (let k of range(Math.ceil(k0), Math.floor(k1))) {
        // Calculate the two endpoints of the line segment in the box:
        const [p0, p1] = (box.clipLine(band.kthLine(k)));
        // Store the offset for line [bandIx, k]:
        offsetOfLines.set(JSON.stringify([bandIx, k]), lineVertices.offset);
        // Store the two endpoints:
        p0(lineVertices.extend());
        p1(lineVertices.extend());
    }
}
// Calculate the intersections of all pairs of grid lines within the box and store
// the intersection positions in a buffer.  Also store the buffer offset in an
// index keyed by the pair of bands and the pair of k values.
const intersectionVertices = new Points2DFloatBacked(16384);
// Offsets are keyed by the JSON representation of {bands: [number, number], ks: [number, number]}.
//const offsetOfIntersections: Map<{bands: [number, number], ks: [number, number]}, number> = new Map();
const offsetOfIntersections = new Map();
for (let [bIx, cIx] of choose2([0, 1, 2])) {
    const band1 = bands[bIx];
    const band2 = bands[cIx];
    const [j0, j1] = band1.kRangeForBox(box);
    const [k0, k1] = band2.kRangeForBox(box);
    for (const [j, k] of cartesian(range(Math.ceil(j0), Math.floor(j1)), range(Math.ceil(k0), Math.floor(k1)))) {
        const p = band1.kthLine(j).intersection(band2.kthLine(k));
        if (p !== null) {
            offsetOfIntersections.set(JSON.stringify({ bands: [bIx, cIx], ks: [j, k] }), intersectionVertices.offset);
            p(intersectionVertices.extend());
        }
    }
}
// Draw the grid lines: we iterate over the lineVertices buffer two points at a time.
/*
ctx.beginPath();
const lineVertexIterator = lineVertices[Symbol.iterator]();
while(true) {
  let {done, value: p1} = lineVertexIterator.next();
  if(done) {
    break;
  }
  let {done: done2, value: p2} = lineVertexIterator.next();
  if(done2) {
    break;
  }
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
}
*/
// Possibly clearer alternative: we get the array of vertices
// instead of using an iterator.
ctx.beginPath();
const lineVerticesArray = lineVertices.arrayLike;
for (let ix = 0; ix < lineVertices.length; ix += 2) {
    const p = lineVerticesArray[ix], q = lineVerticesArray[ix + 1];
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
}
ctx.save();
ctx.lineWidth /= 2;
ctx.stroke();
ctx.restore();
// Draw the intersection points, with a square centered on each one:
ctx.beginPath();
const intxBoxSize = 16;
for (let p of intersectionVertices) {
    ctx.rect(Math.round(p.x - intxBoxSize / 2), Math.round(p.y - intxBoxSize / 2), intxBoxSize, intxBoxSize);
}
ctx.stroke();
ctx.beginPath();
ctx.rect(bounds.left, bounds.top, bounds.width, bounds.height);
ctx.strokeStyle = 'red';
ctx.stroke();
// Read the indexed lines, getting k = -1, 0, and 1 for each LineBands.
const strokeStyles = ['red', 'green', 'blue'];
const lineOffsetsToRead = Array.from(cartesian(range(3), range(-1, 2)));
ctx.save();
ctx.lineWidth *= 3;
for (let offsetIndex of lineOffsetsToRead) {
    console.log(offsetIndex);
    const offset = offsetOfLines.get(JSON.stringify(offsetIndex));
    console.log(offset);
    const p = lineVerticesArray[offset], q = lineVerticesArray[offset + 1];
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.strokeStyle = strokeStyles[offsetIndex[0]];
    ctx.stroke();
}
ctx.restore();
function lastOfThree(j, k) {
    if (j == k || j < 0 || k < 0 || j > 2 || k > 3 || j != Math.round(j) || k != Math.round(k)) {
        throw new Error("bad input");
    }
    if (j == 0 || k == 0) {
        if (j == 1 || k == 1) {
            return 2;
        }
        return 1;
    }
    return 0;
}
// Read the indexed intersection points and get only intersection points
// corresponding to the origin and the six nearest neighbors.
// We do this by picking a pair of bands and getting where their k = -1, 0, and 1
// lines intersect with each other, rejecting any points that are outside of the
// *third* band's -1 <= k <= 1 range.
const intersectionPointsArray = intersectionVertices.arrayLike;
ctx.beginPath();
for (let [bIx, cIx] of choose2([0, 1, 2])) {
    let dIx = lastOfThree(bIx, cIx);
    for (let [j, k] of cartesian(range(-1, 2), range(-1, 2))) {
        const offset = offsetOfIntersections.get(JSON.stringify({ bands: [bIx, cIx], ks: [j, k] }));
        if (offset === undefined) {
            continue;
        }
        const p = intersectionPointsArray[offset];
        const kLastBands = bands[dIx].kForPoint(p);
        if (kLastBands < (-1 - 1e-7) || (1 + 1e-7) < kLastBands) {
            continue;
        }
        console.log(JSON.stringify({ bIx, cIx, indices: [j, k] }));
        ctx.rect(p.x - intxBoxSize / 2, p.y - intxBoxSize / 2, intxBoxSize, intxBoxSize);
    }
}
ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
ctx.fill();
debugger;
const origin = new Standalone(0, 0);
const scratch = new Points2DFloatBacked(32);
// Read the intersection points near the origin:
for (let [j, k] of cartesian(range(-1, 2), range(-1, 2))) {
    if (j == k) {
        // Omit [j, k] == [0, 0] (the origin), [1, 1] (not one of the 6 nearest neighbors),
        // and [2, 2] (also not one of the 6 nearest neighbors).
        continue;
    }
    const offset = offsetOfIntersections.get(JSON.stringify({ bands: [0, 1], ks: [j, k] }));
    if (offset === undefined) {
        throw new Error("expected to be able to get intersection point.");
    }
    const p = intersectionPointsArray[offset];
    const bisector = Line.bisecting(origin, p);
    const [p0, p1] = box.clipLine(bisector);
    p0(scratch.extend());
    p1(scratch.extend());
}
ctx.beginPath();
const bisectorVertices = scratch.arrayLike;
for (let ix = 0; ix < bisectorVertices.length; ix += 2) {
    const p = bisectorVertices[ix], q = bisectorVertices[ix + 1];
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
}
ctx.strokeStyle = 'rgba(0,0,0,0.5)';
ctx.stroke();
