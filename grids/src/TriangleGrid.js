import { Points2DFloatBacked, Standalone } from "./Point2D.js";
import { LineBands } from "./primitives.js";
import { cartesian, flipMap, indexOfMaxAbsolute } from "./util.js";
export function centerKs(go) {
    const result = go.index.slice();
    switch (go.type) {
        case 5:
            break;
        case 0:
            result[1] += 0.5;
            result[2] += 0.5;
            break;
        case 1:
            result[0] += 0.5;
            result[2] += 0.5;
            break;
        case 2:
            result[0] -= 0.5;
            result[1] += 0.5;
            break;
        case 3:
            result[0] += 2 / 3;
            result[1] += 2 / 3;
            result[2] = -result[0] - result[1];
            break;
        case 4:
            result[0] += 1 / 3;
            result[1] += 1 / 3;
            result[2] = -result[0] - result[1];
            break;
    }
    return result;
}
export function centerPoint(grid, go) {
    return grid.getPointAtOffset(centerKs(go));
}
export function* adjacentVertices(v) {
    const [k1, k2, k3] = v.index;
    yield { type: 5, index: [k1 + 1, k2, k3] };
    yield { type: 5, index: [k1, k2 + 1, k3] };
    yield { type: 5, index: [k1 - 1, k2 + 1, k3] };
    yield { type: 5, index: [k1 - 1, k2, k3] };
    yield { type: 5, index: [k1, k2 - 1, k3] };
    yield { type: 5, index: [k1 + 1, k2 - 1, k3] };
}
export function* adjacentFaces(f) {
    const [k1, k2, k3] = f.index;
    switch (f.type) {
        case 4:
            yield { type: 3, index: f.index.slice() };
            yield { type: 3, index: [k1 - 1, k2, k3] };
            yield { type: 3, index: [k1, k2 - 1, k3] };
            return;
        case 3:
            yield { type: 4, index: f.index.slice() };
            yield { type: 4, index: [k1 + 1, k2, k3] };
            yield { type: 4, index: [k1, k2 + 1, k3] };
            return;
    }
}
export function* adjacentEdges(e) {
    const [k1, k2] = e.index;
    for (let vertex of vertices(e)) {
        for (let edge of edges(vertex)) {
            if (edge.type == e.type && edge.index[0] == k1 && edge.index[1] == k2) {
                continue;
            }
            yield edge;
        }
    }
}
export function* faces(go) {
    switch (go.type) {
        case 3:
        case 4:
            yield go;
            return;
        case 0:
            {
                yield { type: 4, index: go.index.slice() };
                let lastIndex = go.index.slice();
                lastIndex[0]--;
                yield { type: 3, index: lastIndex };
                return;
            }
        case 1:
            {
                yield { type: 4, index: go.index.slice() };
                let lastIndex = go.index.slice();
                lastIndex[1]--;
                yield { type: 3, index: lastIndex };
                return;
            }
        case 2:
            {
                let lastIndex = go.index.slice();
                lastIndex[0]--;
                yield { type: 3, index: lastIndex.slice() };
                yield { type: 4, index: lastIndex };
                return;
            }
        case 5:
            {
                yield { type: 4, index: go.index.slice() };
                let lastIndex = go.index.slice();
                lastIndex[0]--;
                yield { type: 3, index: lastIndex.slice() };
                yield { type: 4, index: lastIndex.slice() };
                lastIndex[1]--;
                yield { type: 3, index: lastIndex.slice() };
                lastIndex = go.index.slice();
                lastIndex[1]--;
                yield { type: 4, index: lastIndex.slice() };
                yield { type: 3, index: lastIndex };
                return;
            }
    }
}
export function* edges(go) {
    switch (go.type) {
        case 0:
        case 1:
        case 2:
            yield go;
            return;
        case 3:
            {
                let lastIndex = go.index.slice();
                lastIndex[0]++;
                yield { type: 2, index: lastIndex.slice() };
                yield { type: 0, index: lastIndex };
                lastIndex = go.index.slice();
                lastIndex[1]++;
                yield { type: 1, index: lastIndex.slice() };
                return;
            }
        case 4:
            {
                let lastIndex = go.index.slice();
                lastIndex[0]++;
                yield { type: 2, index: lastIndex };
                yield { type: 0, index: go.index.slice() };
                yield { type: 1, index: go.index.slice() };
                return;
            }
        case 5:
            {
                yield { type: 2, index: go.index.slice() };
                yield { type: 0, index: go.index.slice() };
                yield { type: 1, index: go.index.slice() };
                let lastIndex = go.index.slice();
                lastIndex[1]--;
                yield { type: 0, index: lastIndex };
                lastIndex = go.index.slice();
                lastIndex[0]--;
                yield { type: 1, index: lastIndex };
                lastIndex = go.index.slice();
                lastIndex[0]++;
                lastIndex[1]--;
                yield { type: 2, index: lastIndex };
                return;
            }
    }
}
export function* vertices(go) {
    if (go.type == 0 || go.type == 1 || go.type == 2) {
        yield { type: 5, index: go.index.slice() };
        const offsetIndex = go.index.slice();
        switch (go.type) {
            case 0:
                offsetIndex[1] += 1;
                offsetIndex[2] += 1;
                break;
            case 1:
                offsetIndex[0] += 1;
                offsetIndex[2] += 1;
                break;
            case 2:
                offsetIndex[0] -= 1;
                offsetIndex[1] += 1;
                break;
        }
        yield { type: 5, index: offsetIndex };
    }
    else if (go.type == 5) {
        yield go;
    }
    else if (go.type == 3 || go.type == 4) {
        const indices0 = go.index.slice(), indices1 = go.index.slice(), indices2 = go.index.slice();
        if (go.type == 3) {
            indices0[0] += 1;
            indices1[1] += 1;
            indices2[0] += 1;
            indices2[1] += 1;
        }
        if (go.type == 4) {
            indices0[0] += 1;
            indices1[1] += 1;
            //indices2[0] -= 1;
            //indices2[1] -= 1;
        }
        yield { index: indices0, type: 5 };
        yield { index: indices1, type: 5 };
        yield { index: indices2, type: 5 };
    }
}
;
export const bigTypeianScheme = {
    getIndex: function (object) {
        const typePart = object.type;
        const index1Part = object.index[0] & 0x3fff;
        const index2Part = object.index[1] & 0x3fff;
        return (typePart << 28) | (index1Part << 14) | index2Part;
    },
    getObject: function (number) {
        number = number & 0xffffffff;
        const typePart = (number >> 28);
        const type = Math.round(typePart);
        if (typePart !== type) {
            throw new Error("Number is not a valid index.");
        }
        const index1 = (number >> 14) & 0x3fff;
        const index2 = number & 0x3fff;
        return { type, index: [index1, index2, -index1 - index2] };
    }
};
// TODO: figure out types / interfaces for the representation of triangle
// grid indexes.
export class TriangleGrid {
    bands;
    normalAngles;
    spacing;
    constructor(bands, normalAngles, spacing) {
        this.bands = bands;
        this.normalAngles = normalAngles;
        this.spacing = spacing;
    }
    getGridIndices(point) {
        const [k0, k1, k2] = this.bands.map(band => band.kForPoint(point));
        return [k0, k1, k2];
    }
    getNearest(kind, point) {
        switch (kind) {
            case 'edge':
                return this.getNearestEdge(point);
            case 'face':
                return this.getNearestFace(point);
            case 'vertex':
                return this.getNearestVertex(point);
        }
    }
    getNearestFace(point) {
        const indices = this.getGridIndices(point).map(Math.floor);
        return { type: (3 + TriangleGrid.getIndexParity(indices)), index: indices };
    }
    getNearestVertex(point) {
        const indices = this.getGridIndices(point);
        let leastDistance = Infinity;
        let leastDistanceIndices = indices.slice();
        const scratch = Standalone.origin();
        for (const [opFirst, opSecond] of cartesian([Math.floor, Math.ceil], [Math.floor, Math.ceil])) {
            const testIndices = [opFirst(indices[0]), opSecond(indices[1]), Math.floor(indices[2])];
            const distance = this.getPointAtOffset(testIndices)(scratch).subAssign(point).magnitude();
            if (distance < leastDistance) {
                leastDistance = distance;
                leastDistanceIndices = testIndices;
            }
        }
        return { type: 5, index: leastDistanceIndices };
    }
    getNearestEdge(point) {
        const pointIndices = this.getGridIndices(point);
        const nearestVertexObject = this.getNearestVertex(point);
        const deltaPoint = centerPoint(this, nearestVertexObject)(Standalone.origin()).mulAssign(-1).addAssign(point);
        const deltaDots = this.normalAngles.map(angle => deltaPoint.dotUnit(angle - Math.PI / 2));
        const edgeDirection = indexOfMaxAbsolute(deltaDots);
        const deltaIndex = (edgeDirection + (edgeDirection == 0 ? 1 : 2)) % 3;
        const sign = Math.sign(pointIndices[deltaIndex] - nearestVertexObject.index[deltaIndex]);
        let nearestVertexIndex = nearestVertexObject.index.slice();
        if (sign == -1) {
            switch (edgeDirection) {
                case 0:
                    nearestVertexIndex[1] -= 1;
                    nearestVertexIndex[2] += 1;
                    break;
                case 1:
                    nearestVertexIndex[0] -= 1;
                    nearestVertexIndex[2] += 1;
                    break;
                case 2:
                    nearestVertexIndex[0] += 1;
                    nearestVertexIndex[1] -= 1;
                    break;
            }
        }
        return {
            type: edgeDirection,
            index: nearestVertexIndex
        };
    }
    static getIndexParity(index) {
        return (((index[0] + index[1] + index[2]) % 2) + 2) % 2;
    }
    static getAdjacentFaceIndices(index) {
        if (index.some(ix => ix != Math.round(ix))) {
            throw new Error("Index must be integral.");
        }
        index = index.map(Math.floor);
        const parity = TriangleGrid.getIndexParity(index);
        const result = [];
        for (let ix = 0; ix < 3; ix++) {
            const indexCopy = index.slice();
            indexCopy[ix] += (parity == 0) ? 1 : -1;
            result.push(indexCopy);
        }
        return result;
    }
    getFaceIndexNearestPoint(point) {
        return this.getGridIndices(point).map(Math.floor);
    }
    getPointAtOffset(index) {
        const line0 = this.bands[0].kthLine(index[0]);
        const line1 = this.bands[1].kthLine(index[1]);
        return line0.intersection(line1);
    }
    getNearestFaceCenter(index) {
        index = index.map(Math.floor);
        const parity = TriangleGrid.getIndexParity(index);
        const bandOffset = (2 - parity) / 3;
        return this.getPointAtOffset([index[0] + bandOffset, index[1] + bandOffset, -2 * bandOffset - index[0] - index[1]]);
        // const line0 = this.bands[0].kthLine(index[0] + bandOffset);
        // const line1 = this.bands[1].kthLine(index[1] + bandOffset);
        // return line0.intersection(line1)!;
    }
    getFaceCenterNearestPoint(point) {
        const indices = this.getGridIndices(point);
        return this.getNearestFaceCenter(indices);
    }
    // TODO: index face vertices, such that the same vertex has the same index,
    // regardless of whether it's considered as part of one face or another.
    // TODO: find the nearest face vertex to a point.
    // TODO: find the nearest face edge to a point.
    getFaceVertices(index) {
        if (index.some(ix => ix != Math.round(ix))) {
            throw new Error("Index must be integral.");
        }
        const parity = TriangleGrid.getIndexParity(index);
        const faceCenter = this.getNearestFaceCenter(index);
        const result = [];
        for (let ix = 0; ix < 3; ix++) {
            const vertex = (point) => faceCenter(point).addPolar(this.spacing * 2 / 3, this.normalAngles[ix] + (parity == 0 ? Math.PI : 0));
            result.push(vertex);
        }
        return result;
    }
}
const specialOrientations = new Map([
    [0, 'point+x'],
    [90, 'point+y'],
    [180, 'point-x'],
    [270, 'point-y']
]);
const namedOrientations = flipMap(specialOrientations);
export function angleToOrientation(angleDegrees) {
    while (angleDegrees < 0) {
        angleDegrees += 360;
    }
    while (angleDegrees >= 360) {
        angleDegrees -= 360;
    }
    if (specialOrientations.has(angleDegrees)) {
        return specialOrientations.get(angleDegrees);
    }
    return ['point-angle', angleDegrees * Math.PI / 180];
}
export function orientationToAngle(orientation) {
    if (typeof orientation == 'string') {
        return namedOrientations.get(orientation) * Math.PI / 180;
    }
    const [_, angle] = orientation;
    return angle;
}
export class TriangleGridKernel {
    centerOfFace0;
    face0Vertices;
    normals;
    normalAngles;
    bands;
    constructor(centerOfFace0, face0Vertices, normals, normalAngles, bands) {
        this.centerOfFace0 = centerOfFace0;
        this.face0Vertices = face0Vertices;
        this.normals = normals;
        this.normalAngles = normalAngles;
        this.bands = bands;
    }
    getFaceIndices(xOrPoint, y) {
        const point = (typeof xOrPoint == 'number') ? new Standalone(xOrPoint, y) : xOrPoint;
        const [k0, k1, k2] = this.bands.map(band => band.kForPoint(point));
        return [k0, k1, k2];
    }
    static make(offsetting, orientation, spacing) {
        let angle0 = orientationToAngle(orientation) + Math.PI;
        const angles = [angle0, angle0 + 2 * Math.PI / 3, angle0 + 4 * Math.PI / 3];
        let offsets;
        if (offsetting == 'face-center-at-origin') {
            offsets = [-2 * spacing / 3, spacing / 3, spacing / 3];
        }
        else {
            offsets = [0, 0, 0];
        }
        const normals = new Points2DFloatBacked(3);
        normals.extend().setUnitCircle(angles[0]);
        normals.extend().setUnitCircle(angles[1]);
        normals.extend().setUnitCircle(angles[2]);
        const bands = [];
        for (let ix = 0; ix < 3; ix++) {
            bands.push(new LineBands(normals.item(ix), offsets[ix], spacing));
        }
        const references = new Points2DFloatBacked(6);
        const line0 = bands[0].kthLine(1), line1 = bands[1].kthLine(0), line2 = bands[2].kthLine(0);
        const face0Vertex0 = (line0.intersection(line1))(references.extend());
        const face0Vertex1 = (line1.intersection(line2))(references.extend());
        const face0Vertex2 = (line2.intersection(line0))(references.extend());
        const centerOfFace0 = references.extend();
        centerOfFace0.addAssign(face0Vertex0).addAssign(face0Vertex1).addAssign(face0Vertex2).mulAssign(1 / 3);
        return new TriangleGridKernel(centerOfFace0, [face0Vertex0, face0Vertex1, face0Vertex2], [normals.item(0), normals.item(1), normals.item(2)], angles, [bands[0], bands[1], bands[2]]);
    }
}
