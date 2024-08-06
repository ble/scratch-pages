import { decX, decY, incX, incY } from "./index2.js";
import { Standalone, write } from "./Point2D.js";
import { Brush, pathLines, pathLoop } from "./canvas_helpers.js";
import { LineBands, bandLinesInsideBox } from "./primitives.js";
import { zip } from "./util.js";
export class GridVertex {
    grid;
    #index;
    get type() { return 3; }
    constructor(grid, index) {
        this.grid = grid;
        this.#index = index;
    }
    nVertices() {
        return 1;
    }
    *vertices() { yield this; }
    *edges() {
        yield new GridEdge(this.grid, this.#index, 0);
        yield new GridEdge(this.grid, this.#index, 1);
        yield new GridEdge(this.grid, decX(this.#index), 0);
        yield new GridEdge(this.grid, decY(this.#index), 1);
    }
    *faces() {
        yield new GridFace(this.grid, this.#index);
        yield new GridFace(this.grid, decX(this.#index));
        yield new GridFace(this.grid, decX(decY(this.#index)));
        yield new GridFace(this.grid, decY(this.#index));
    }
    *adjacentVertices() {
        yield new GridVertex(this.grid, incX(this.#index));
        yield new GridVertex(this.grid, incY(this.#index));
        yield new GridVertex(this.grid, decX(this.#index));
        yield new GridVertex(this.grid, decY(this.#index));
    }
    get kind() { return 'vertex'; }
    get index() { return this.#index; }
    point() { return this.grid.getPoint(this.#index); }
    get [0]() { return this.#index[0]; }
    get [1]() { return this.#index[1]; }
}
;
export class GridEdge {
    grid;
    #index;
    type; // 0 for horizontal, 1 for vertical
    constructor(grid, index, type) {
        this.grid = grid;
        this.#index = index;
        this.type = type;
    }
    nVertices() {
        return 2;
    }
    *vertices() {
        yield new GridVertex(this.grid, this.#index);
        yield new GridVertex(this.grid, this.type == 0 ? incX(this.#index) : incY(this.#index));
    }
    *edges() { yield this; }
    *faces() {
        yield new GridFace(this.grid, this.#index);
        yield new GridFace(this.grid, this.type == 0 ? decY(this.#index) : decX(this.#index));
    }
    *adjacentEdges() {
        if (this.type == 0) {
            yield new GridEdge(this.grid, incX(this.#index), 0);
            yield new GridEdge(this.grid, incX(this.#index), 1);
            yield new GridEdge(this.grid, this.#index, 1);
            yield new GridEdge(this.grid, decX(this.#index), 0);
            yield new GridEdge(this.grid, decY(this.#index), 1);
            yield new GridEdge(this.grid, decY(incX(this.#index)), 1);
        }
        else {
            yield new GridEdge(this.grid, incY(this.#index), 0);
            yield new GridEdge(this.grid, incY(this.#index), 1);
            yield new GridEdge(this.grid, decX(incY(this.#index)), 0);
            yield new GridEdge(this.grid, decX(this.#index), 0);
            yield new GridEdge(this.grid, decY(this.#index), 1);
            yield new GridEdge(this.grid, this.#index, 0);
        }
    }
    centerPoint() {
        return (this.type == 0) ? this.grid.getPoint([this[0] + 0.5, this[1]])
            : this.grid.getPoint([this[0], this[1] + 0.5]);
    }
    get kind() { return 'edge'; }
    get index() { return this.#index; }
    get [0]() { return this.#index[0]; }
    get [1]() { return this.#index[1]; }
}
;
export class GridFace {
    grid;
    #index;
    get type() { return 2; }
    constructor(grid, index) {
        this.grid = grid;
        this.#index = index;
    }
    nVertices() {
        return 4;
    }
    *vertices() {
        yield new GridVertex(this.grid, this.#index);
        yield new GridVertex(this.grid, incX(this.#index));
        yield new GridVertex(this.grid, incY(incX(this.#index)));
        yield new GridVertex(this.grid, incY(this.#index));
    }
    *edges() {
        yield new GridEdge(this.grid, this.#index, 0);
        yield new GridEdge(this.grid, incX(this.#index), 1);
        yield new GridEdge(this.grid, incY(this.#index), 0);
        yield new GridEdge(this.grid, this.#index, 1);
    }
    *faces() { yield this; }
    *adjacentFaces() {
        yield new GridFace(this.grid, incX(this.#index));
        yield new GridFace(this.grid, incY(this.#index));
        yield new GridFace(this.grid, decX(this.#index));
        yield new GridFace(this.grid, decY(this.#index));
    }
    centerPoint() {
        return this.grid.getPoint([this[0] + 0.5, this[1] + 0.5]);
    }
    get kind() { return 'face'; }
    get index() { return this.#index; }
    get [0]() { return this.#index[0]; }
    get [1]() { return this.#index[1]; }
}
;
class CanonicalSquareGrid {
    getNearest(k, point) {
        switch (k) {
            case 'vertex':
                return this.#nearestVertex(point);
            case 'edge':
                return this.#nearestEdge(point);
            case 'face': return this.#nearestFace(point);
        }
    }
    #nearestVertex(point) {
        return new GridVertex(this, [Math.round(point.x), Math.round(point.y)]);
    }
    #nearestEdge(point) {
        const nearestX = Math.round(point.x), nearestY = Math.round(point.y), dx = point.x - nearestX, dy = point.y - nearestY;
        if (Math.abs(dy) < Math.abs(dx)) {
            // If the point is closer to an integral value of y than an integral
            // value of x, then it's closer to a horizontal edge:
            return new GridEdge(this, [Math.floor(point.x), nearestY], 0);
        }
        else {
            return new GridEdge(this, [nearestX, Math.floor(point.y)], 1);
        }
    }
    #nearestFace(point) {
        return new GridFace(this, [Math.floor(point.x), Math.floor(point.y)]);
    }
    get origin() {
        return new GridVertex(this, [0, 0]);
    }
    #bands = [
        LineBands.make(new Standalone(1, 0), 0, 1),
        LineBands.make(new Standalone(0, 1), 0, 1)
    ];
    *gridLinesInside(aabb) {
        for (let band of this.#bands) {
            for (let line of bandLinesInsideBox(band, aabb)) {
                const points = aabb.clipLine(line);
                if (points === null) {
                    continue;
                }
                yield points[0];
                yield points[1];
            }
        }
    }
    *gridLinesThrough(index) {
        for (let [band, ix] of zip(this.#bands, index)) {
            yield band.kthLine(ix);
        }
    }
    getPoint(ix) {
        return write(ix[0], ix[1]);
    }
    getFullIndices(r) {
        return this.getIndices(r);
    }
    getIndices(r) {
        return [r.x, r.y];
    }
}
export const canonicalSquareGrid = new CanonicalSquareGrid();
export class SquareGrid {
    toCanonical;
    fromCanonical;
    #scratchPoint = Standalone.origin();
    static create(scale = 1, rotation = 0, translation, angleMeasure = 'radians') {
        if (angleMeasure === 'degrees') {
            rotation *= Math.PI / 180;
        }
        if (scale == 1 && rotation == 0 && translation === undefined) {
            return canonicalSquareGrid;
        }
        const fromCanonical = new DOMMatrix();
        fromCanonical.scaleSelf(scale);
        fromCanonical.rotateSelf(rotation * 180 / Math.PI);
        if (translation !== undefined && translation !== null) {
            fromCanonical.translateSelf(translation.x, translation.y);
        }
        const toCanonical = fromCanonical.inverse();
        const normals = [Standalone.origin(), Standalone.origin()];
        normals[0].setUnitCircle(rotation);
        normals[1].setUnitCircle(rotation + Math.PI / 2);
        const band0 = LineBands.make(normals[0], translation ? normals[0].dot(translation) : 0, scale), band1 = LineBands.make(normals[1], translation ? normals[1].dot(translation) : 0, scale);
        return new SquareGrid(toCanonical, fromCanonical, [band0, band1]);
    }
    #bands;
    constructor(toCanonical, fromCanonical, bands) {
        this.toCanonical = toCanonical;
        this.fromCanonical = fromCanonical;
        this.#bands = bands;
    }
    get origin() {
        return new GridVertex(this, [0, 0]);
    }
    *gridLinesInside(aabb) {
        for (let band of this.#bands) {
            for (let line of bandLinesInsideBox(band, aabb)) {
                const points = aabb.clipLine(line);
                if (points === null) {
                    continue;
                }
                yield points[0];
                yield points[1];
            }
        }
    }
    *gridLinesThrough(index) {
        for (let [band, ix] of zip(this.#bands, index)) {
            yield band.kthLine(ix);
        }
    }
    getNearest(k, point) {
        const result = canonicalSquareGrid.getNearest(k, this.toCanonical.transformPoint(point));
        result.grid = this;
        return result;
    }
    getPoint(ix) {
        return (destination) => {
            this.#scratchPoint.x = ix[0];
            this.#scratchPoint.y = ix[1];
            return write(this.fromCanonical.transformPoint(this.#scratchPoint))(destination);
        };
    }
    getFullIndices(r) {
        return this.getIndices(r);
    }
    getIndices(r) {
        return canonicalSquareGrid.getIndices(this.toCanonical.transformPoint(r));
    }
}
export class VertexBrush extends Brush {
    size;
    drawInner(ctx, vertices) {
        const size = (typeof this.size === "function") ? this.size() : this.size;
        ctx.beginPath();
        for (let vertex of vertices) {
            ctx.rect(vertex.x - size / 2, vertex.y - size / 2, size, size);
        }
        ctx.fill();
        ctx.stroke();
    }
    constructor(size) {
        super();
        this.size = size;
    }
}
export class EdgeBrush extends Brush {
    drawInner(ctx, vertices) {
        ctx.beginPath();
        pathLines(ctx, vertices, [0, vertices.length]);
        ctx.stroke();
    }
}
export class FaceBrush extends Brush {
    verticesPerFace = 4;
    drawInner(ctx, vertices) {
        const N = this.verticesPerFace;
        ctx.beginPath();
        for (let ix = 0; ix + (N - 1) < vertices.length; ix += N) {
            pathLoop(ctx, vertices, [ix, ix + N]);
        }
        ctx.stroke();
        ctx.fill();
    }
}
