import { Points2DFloatBacked, Standalone } from "./Point2D.js";
// type SegmentOp = "moveTo" | "lineTo" | "closePath" | "changeLast";
// const segmentOps: SegmentOp[] = ["moveTo", "lineTo", "closePath", "changeLast"] as const;
// type SegmentInstruction = {
//   op: SegmentOp;
//   x?: number;
//   y?: number;
//   vertex: Point2DReadonly;
//   t: number;
// }
// class Instruction implements SegmentInstruction {
//   constructor(readonly backing: DataView) {}
//   get x(): number {
//     return this.backing.getFloat32(4);
//   }
//   get y(): number {
//     return this.backing.getFloat32(8);
//   }
//   get vertex(): Point2DReadonly {
//     return this;
//   }
//   get t(): number {
//     return this.backing.getFloat32(12);
//   }
//   get op(): SegmentOp {
//     return segmentOps[this.backing.getUint8(0)];
//   }
// }
export class LineSegments {
    vertices = new Points2DFloatBacked(16384);
    indices = new Int32Array(16384);
    iix = 0;
    lastStartIndex = -1;
    get anyLines() {
        return this.linesDrawn;
    }
    linesDrawn = false;
    reset() {
        this.vertices.offset = 0;
        this.iix = 0;
        this.lastStartIndex = -1;
        this.linesDrawn = false;
    }
    path(ctx) {
        let isLineBroken = true;
        for (let step = 0; step < this.iix; step++) {
            const index = this.indices[step];
            if (index == -1) {
                isLineBroken = true;
                continue;
            }
            const vertex = this.vertices.item(index);
            if (isLineBroken) {
                ctx.moveTo(vertex.x, vertex.y);
                isLineBroken = false;
            }
            else {
                ctx.lineTo(vertex.x, vertex.y);
            }
        }
    }
    #scratch = Standalone.origin();
    pathWithTransform(ctx, transform) {
        let isLineBroken = true;
        const vertex = this.#scratch;
        for (let step = 0; step < this.iix; step++) {
            const index = this.indices[step];
            if (index == -1) {
                isLineBroken = true;
                continue;
            }
            transform(this.vertices.item(index), this.#scratch);
            if (isLineBroken) {
                ctx.moveTo(vertex.x, vertex.y);
                isLineBroken = false;
            }
            else {
                ctx.lineTo(vertex.x, vertex.y);
            }
        }
    }
    moveTo(p) {
        // console.info(`moveTo(${p.x}, ${p.y})`);
        const newVertexIndex = this.vertices.offset;
        // To the vertices, append a new vertex.
        this.vertices.put(p);
        // To the indices, append a linebreak and then a pointer to the new vertex.
        this.indices[this.iix++] = -1;
        this.indices[this.iix++] = newVertexIndex;
        this.lastStartIndex = this.vertices.offset - 1;
        // Set lastStartIndex so that a closePath() will return to this new vertex:
        this.lastStartIndex = newVertexIndex;
    }
    lineTo(p) {
        // console.info(`lineTo(${p.x}, ${p.y})`);
        const newVertexIndex = this.vertices.offset;
        // To the vertices, append a new vertex.
        this.vertices.put(p);
        // To the indices, append a pointer to the new vertex.
        this.indices[this.iix++] = newVertexIndex;
        this.linesDrawn = true;
    }
    closePath() {
        // console.info(`closePath()`);
        // To the indices, append a pointer to the start of the path.
        this.indices[this.iix++] = this.lastStartIndex;
    }
    changeLast(p) {
        // console.info(`changeLast(${p.x}, ${p.y})`);
        const newVertexIndex = this.vertices.offset;
        const previousTailIndex = this.indices[this.iix - 1];
        // To the vertices, append a new vertex.
        this.vertices.put(p);
        // To the indices, change the last index to point at the new vertex.
        this.indices[this.iix - 1] = newVertexIndex;
        // Ensure that closePath() will return to the new vertex, if this point replaces the start of the path.
        if (previousTailIndex == this.lastStartIndex) {
            this.lastStartIndex = newVertexIndex;
        }
    }
    changeLastLine(p, q) {
        let newVertexIndex = this.vertices.offset;
        this.vertices.put(p);
        const previousTailIndex = this.indices[this.iix - 2];
        if (previousTailIndex == this.lastStartIndex) {
            this.lastStartIndex = newVertexIndex;
        }
        this.indices[this.iix - 2] = newVertexIndex;
        newVertexIndex = this.vertices.offset;
        this.vertices.put(q);
        this.indices[this.iix - 1] = newVertexIndex;
    }
}
