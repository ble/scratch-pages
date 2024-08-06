import { Standalone, write } from './Point2D.js';
import { incX, incY, decX, decY } from './index2.js';
import { LineBands, bandLinesInsideBox } from './primitives.js';
import { cartesian, greatest, zip } from './util.js';
export class GridVertex {
    grid;
    #index;
    get type() { return 5; }
    constructor(grid, index) {
        this.grid = grid;
        this.#index = index;
    }
    nVertices() {
        return 1;
    }
    *vertices() {
        yield this;
    }
    *edges() {
        yield new GridEdge(this.grid, this.#index, 0);
        yield new GridEdge(this.grid, decX(this.#index), 2);
        yield new GridEdge(this.grid, this.#index, 1);
        yield new GridEdge(this.grid, decY(this.#index), 0);
        yield new GridEdge(this.grid, this.#index, 2);
        yield new GridEdge(this.grid, decY(decX(this.#index)), 1);
    }
    *faces() {
        yield new GridFace(this.grid, this.#index, 3);
        yield new GridFace(this.grid, this.#index, 4);
        yield new GridFace(this.grid, decX(this.#index), 3);
        yield new GridFace(this.grid, decY(decX(this.#index)), 4);
        yield new GridFace(this.grid, decY(decX(this.#index)), 3);
        yield new GridFace(this.grid, decY(this.#index), 4);
    }
    *adjacentVertices() {
        yield new GridVertex(this.grid, incX(this.#index));
        yield new GridVertex(this.grid, incY(incX(this.#index)));
        yield new GridVertex(this.grid, incY(this.#index));
        yield new GridVertex(this.grid, decX(this.#index));
        yield new GridVertex(this.grid, decY(decX(this.#index)));
        yield new GridVertex(this.grid, decY(this.#index));
    }
    get kind() { return 'vertex'; }
    ;
    get index() { return this.#index; }
    point() {
        return this.grid.getPoint(this.#index);
    }
    get [0]() { return this.#index[0]; }
    get [1]() { return this.#index[1]; }
}
export class GridEdge {
    grid;
    #index;
    type;
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
        switch (this.type) {
            case 0:
                yield new GridVertex(this.grid, incY(this.#index));
                return;
            case 1:
                yield new GridVertex(this.grid, incX(incY((this.#index))));
                return;
            case 2: yield new GridVertex(this.grid, incX(this.#index));
        }
    }
    *edges() {
        yield this;
    }
    *faces() {
        switch (this.type) {
            case 0:
                yield new GridFace(this.grid, this.#index, 4);
                yield new GridFace(this.grid, decX(this.#index), 3);
                return;
            case 1:
                yield new GridFace(this.grid, this.#index, 3);
                yield new GridFace(this.grid, this.#index, 4);
                return;
            case 2:
                yield new GridFace(this.grid, this.#index, 3);
                yield new GridFace(this.grid, decY(this.#index), 4);
                return;
        }
        throw new Error('Invalid edge type');
    }
    *adjacentEdges() {
        switch (this.type) {
            case 0:
                yield new GridEdge(this.grid, incY(this.#index), 2);
                yield new GridEdge(this.grid, incY(this.#index), 1);
                yield new GridEdge(this.grid, incY(this.#index), 0);
                yield new GridEdge(this.grid, decX(incY(this.#index)), 2);
                yield new GridEdge(this.grid, decX(this.#index), 1);
                //
                yield new GridEdge(this.grid, decX(this.#index), 2);
                yield new GridEdge(this.grid, decY(decX(this.#index)), 1);
                yield new GridEdge(this.grid, decY(this.#index), 0);
                yield new GridEdge(this.grid, this.#index, 2);
                yield new GridEdge(this.grid, this.#index, 1);
                return;
            case 1:
                yield new GridEdge(this.grid, incX(this.#index), 0);
                yield new GridEdge(this.grid, incX(incY(this.#index)), 2);
                yield new GridEdge(this.grid, incX(incY(this.#index)), 1);
                yield new GridEdge(this.grid, incX(incY(this.#index)), 0);
                yield new GridEdge(this.grid, incY(this.#index), 2);
                //
                yield new GridEdge(this.grid, this.#index, 0);
                yield new GridEdge(this.grid, decX(this.#index), 2);
                yield new GridEdge(this.grid, decY(decX(this.#index)), 1);
                yield new GridEdge(this.grid, decY(this.#index), 0);
                yield new GridEdge(this.grid, this.#index, 2);
                return;
            case 2:
                yield new GridEdge(this.grid, incX(this.#index), 0);
                yield new GridEdge(this.grid, incX(this.#index), 1);
                yield new GridEdge(this.grid, incX(this.#index), 2);
                yield new GridEdge(this.grid, incX(decY(this.#index)), 0);
                yield new GridEdge(this.grid, decY(this.#index), 1);
                //
                yield new GridEdge(this.grid, decY(this.#index), 0);
                yield new GridEdge(this.grid, decX(decY(this.#index)), 1);
                yield new GridEdge(this.grid, decX(this.#index), 2);
                yield new GridEdge(this.grid, this.#index, 0);
                yield new GridEdge(this.grid, this.#index, 1);
                return;
            default:
                throw new Error('Invalid edge type');
        }
    }
    centerPoint() {
        switch (this.type) {
            case 0:
                return this.grid.getPoint([this.#index[0], this.#index[1] + 0.5]);
            case 1:
                return this.grid.getPoint([this.#index[0] - 0.5, this.#index[1] - 0.5]);
            case 2:
                return this.grid.getPoint([this.#index[0] + 0.5, this.#index[1]]);
        }
    }
    get kind() { return 'edge'; }
    ;
    get index() { return this.#index; }
    get [0]() { return this.#index[0]; }
    get [1]() { return this.#index[1]; }
}
export class GridFace {
    grid;
    #index;
    type;
    constructor(grid, index, type) {
        this.grid = grid;
        this.#index = index;
        this.type = type;
    }
    nVertices() {
        return 3;
    }
    *vertices() {
        switch (this.type) {
            case 3:
                yield new GridVertex(this.grid, this.#index);
                yield new GridVertex(this.grid, incX(this.#index));
                yield new GridVertex(this.grid, incY(incX(this.#index)));
                break;
            case 4:
                yield new GridVertex(this.grid, this.#index);
                yield new GridVertex(this.grid, incY(incX(this.#index)));
                yield new GridVertex(this.grid, incY(this.#index));
                break;
            default:
                throw new Error('Invalid face type');
        }
    }
    *edges() {
        switch (this.type) {
            case 3:
                yield new GridEdge(this.grid, incX(this.#index), 0);
                yield new GridEdge(this.grid, this.#index, 1);
                yield new GridEdge(this.grid, this.#index, 2);
                break;
            case 4:
                yield new GridEdge(this.grid, this.#index, 0);
                yield new GridEdge(this.grid, this.#index, 1);
                yield new GridEdge(this.grid, incY(this.#index), 2);
                break;
            default:
                throw new Error('Invalid face type');
        }
    }
    *faces() {
        yield this;
    }
    *adjacentFaces() {
        if (this.type !== 3 && this.type !== 4) {
            throw new Error('Invalid face type');
        }
        if (this.type === 3) {
            yield new GridFace(this.grid, this.#index, 4);
            yield new GridFace(this.grid, incX(this.#index), 4);
            yield new GridFace(this.grid, decY(this.#index), 4);
        }
        else {
            yield new GridFace(this.grid, this.#index, 3);
            yield new GridFace(this.grid, decX(this.#index), 3);
            yield new GridFace(this.grid, incY(this.#index), 3);
        }
    }
    centerPoint() {
        throw new Error('Method not implemented.');
    }
    get kind() { return 'face'; }
    get index() { return this.#index; }
    get [0]() { return this.#index[0]; }
    get [1]() { return this.#index[1]; }
}
class CanonicalTriangleGrid {
    #scratchPoint = Standalone.origin();
    getNearest(k, point) {
        switch (k) {
            case 'vertex':
                return this.#nearestVertex(point);
            case 'edge':
                return this.#nearestEdge(point);
            case 'face':
                return this.#nearestFace(point);
        }
    }
    #nearestVertex(point) {
        const indices = this.getIndices(point);
        const scratch = Standalone.origin();
        let leastDistance = Infinity, bestIndex = null;
        let distances = [], candidates = [], candidatePoints = [];
        for (const [op1, op2] of cartesian([Math.floor, Math.ceil], [Math.floor, Math.ceil])) {
            const candidate = [op1(indices[0]), op2(indices[1])];
            const cpoint = this.getPoint(candidate)(scratch);
            candidatePoints.push({ x: cpoint.x, y: cpoint.y });
            const distance = this.getPoint(candidate)(scratch).subAssign(point).magnitude();
            if (bestIndex == null || distance < leastDistance) {
                bestIndex = candidate;
                leastDistance = distance;
            }
            distances.push(distance);
            candidates.push(candidate);
        }
        return new GridVertex(this, bestIndex);
    }
    #nearestEdge(point) {
        const vertex1 = this.#nearestVertex(point);
        const delta = vertex1.point()(Standalone.origin()).mulAssign(-1).addAssign(point);
        const deltaDots = this.tangents.map(tangent => delta.dot(tangent));
        const { index: greatestIndex } = greatest(deltaDots.map(Math.abs));
        if (greatestIndex !== 0 && greatestIndex !== 1 && greatestIndex !== 2) {
            throw new Error('leastIndex out of range');
        }
        const deltaSign = delta.dot(this.tangents[greatestIndex]) >= 0 ? 1 : -1;
        let index;
        if (deltaSign < 0) {
            switch (greatestIndex) {
                case 0:
                    index = decY(vertex1.index);
                    break;
                case 1:
                    index = decY(decX(vertex1.index));
                    break;
                case 2:
                    index = decX(vertex1.index);
                    break;
            }
            return new GridEdge(this, index, greatestIndex);
        }
        else {
            index = vertex1.index.slice();
        }
        return new GridEdge(this, index, greatestIndex);
    }
    #nearestFace(point) {
        const index = this.getIndices(point).map(Math.floor);
        const lastIndex = Math.floor(this.bands[2].kForPoint(point));
        return new GridFace(this, index, (4 - this.#getIndexParity(index[0], index[1], lastIndex)));
    }
    #getIndexParity(arg0, arg1, lastIndex) {
        // Modulo operators don't force a positive sign, so we have to do something silly:
        let parity = (arg0 + arg1 + lastIndex) % 2;
        return ((parity + 2) % 2);
    }
    get origin() {
        return new GridVertex(this, [0, 0]);
    }
    get bands() { return CanonicalTriangleGrid.#bands; }
    get tangents() { return CanonicalTriangleGrid.#tangents; }
    static #bands = [
        LineBands.make(Standalone.origin().setUnitCircle(0), 0, 1),
        LineBands.make(Standalone.origin().setUnitCircle(2 * Math.PI / 3), 0, 1),
        LineBands.make(Standalone.origin().setUnitCircle(4 * Math.PI / 3), 0, 1),
    ];
    static #tangents = [
        Standalone.origin().setUnitCircle(Math.PI / 2),
        Standalone.origin().setUnitCircle(Math.PI / 6),
        Standalone.origin().setUnitCircle(-Math.PI / 6),
    ];
    indexToSpace = (function () {
        const self = CanonicalTriangleGrid;
        let p0 = (self.#bands[0].kthLine(1).intersection(self.#bands[1].kthLine(0)))(Standalone.origin()), p1 = (self.#bands[0].kthLine(0).intersection(self.#bands[1].kthLine(1)))(Standalone.origin());
        return new DOMMatrix([p0.x, p0.y, p1.x, p1.y, 0, 0]);
    })();
    spaceToIndex = this.indexToSpace.inverse();
    getIndices(r) {
        //return [this.#bands[0].kForPoint(r), this.#bands[1].kForPoint(r)];
        let tx = this.spaceToIndex.transformPoint(r);
        return [tx.x, tx.y];
    }
    getFullIndices(r) {
        return [this.bands[0].kForPoint(r), this.bands[1].kForPoint(r), this.bands[2].kForPoint(r)];
    }
    getPoint(index) {
        let tx = this.indexToSpace.transformPoint(new DOMPoint(index[0], index[1]));
        return write(tx);
        //return (this.#bands[0].kthLine(index[0]).intersection(this.#bands[1].kthLine(index[1])))!;
    }
    *gridLinesThrough(index) {
        this.getPoint(index)(this.#scratchPoint);
        const index2 = index.slice();
        index2.push(this.bands[2].kForPoint(this.#scratchPoint));
        for (let [band, ix] of zip(this.bands, index2)) {
            yield band.kthLine(ix);
        }
    }
    *gridLinesInside(aabb) {
        for (let band of this.bands) {
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
}
export const canonicalTriangleGrid = new CanonicalTriangleGrid();
export class TriangleGrid extends CanonicalTriangleGrid {
    #scratchPoint = Standalone.origin();
    #bands;
    #tangents;
    #canonical;
    static create(scale = 1, rotation = 0, translation, angleMeasure = 'radians') {
        if (angleMeasure === 'degrees') {
            rotation *= Math.PI / 180;
        }
        if (scale == 1 && rotation == 0 && translation === undefined) {
            return canonicalTriangleGrid;
        }
        const fromCanonical = new DOMMatrix();
        fromCanonical.scaleSelf(scale);
        fromCanonical.rotateSelf(rotation * 180 / Math.PI);
        if (translation !== undefined && translation !== null) {
            fromCanonical.translateSelf(translation.x, translation.y);
        }
        const normals = [Standalone.origin(), Standalone.origin(), Standalone.origin()];
        normals[0].setUnitCircle(rotation);
        normals[1].setUnitCircle(rotation + Math.PI * 1 / 3);
        normals[2].setUnitCircle(rotation + Math.PI * 2 / 3);
        const band0 = LineBands.make(normals[0], translation ? normals[0].dot(translation) : 0, scale), band1 = LineBands.make(normals[1], translation ? normals[1].dot(translation) : 0, scale), band2 = LineBands.make(normals[2], translation ? normals[2].dot(translation) : 0, scale);
        const tangents = [
            Standalone.origin().setUnitCircle(rotation + Math.PI / 2),
            Standalone.origin().setUnitCircle(rotation + Math.PI / 6),
            Standalone.origin().setUnitCircle(rotation - Math.PI / 6),
        ];
        return new TriangleGrid([band0, band1, band2], tangents);
    }
    constructor(bands, tangents) {
        super();
        this.#bands = bands;
        this.#tangents = tangents;
        this.#canonical = canonicalTriangleGrid;
    }
    get bands() { return this.#bands; }
    get tangents() { return this.#tangents; }
    get origin() {
        return this.#canonical.origin;
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
    getIndices(r) {
        return [this.#bands[0].kForPoint(r), this.#bands[1].kForPoint(r)];
    }
    getFullIndices(r) {
        return [this.#bands[0].kForPoint(r), this.#bands[1].kForPoint(r), this.#bands[2].kForPoint(r)];
    }
    getPoint(index) {
        return (this.#bands[0].kthLine(index[0]).intersection(this.#bands[1].kthLine(index[1])));
    }
}
