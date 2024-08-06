import { Standalone, write } from "./Point2D.js";
import { range } from "./util.js";
export class Line {
    normal;
    distance;
    // This line class represents an infinite line in 2D space as a unit normal
    // vector and a distance from the origin.
    // It can be thought of as the set of all points r that satisfy the equation
    // normal ⋅ r = distance
    static make(normal, distance) {
        normal.normalize();
        return new Line(normal, distance);
    }
    static bisecting(p0, p1, normalStorage) {
        let halfway;
        if (normalStorage === undefined) {
            halfway = new Standalone(0, 0);
        }
        else {
            halfway = normalStorage.extend();
        }
        halfway.setTo(p1).subAssign(p0).mulAssign(0.5).addAssign(p0);
        const distance = halfway.magnitude();
        let normal = halfway.normalize();
        return new Line(normal, distance);
    }
    constructor(normal, distance) {
        this.normal = normal;
        this.distance = distance;
        if (Math.abs(normal.magnitude() - 1) > 1e-7) {
            throw new Error("bad normal vector.");
        }
    }
    isVerticalLine() {
        return Math.abs(this.normal.y) < 1e-7;
    }
    isHorizontalLine() {
        return Math.abs(this.normal.x) < 1e-7;
    }
    pointNearestOrigin() {
        return (destination) => {
            destination.setTo(this.normal);
            destination.mulAssign(this.distance);
            return destination;
        };
    }
    xSlopeIntercept() {
        // Return the slope and y-intercept of the line in the form y = mx + b.
        // Derivation from the object's equation:
        // normal ⋅ r = distance
        // normal.x * r.x + normal.y * r.y = distance
        // normal.y * r.y = distance - normal.x * r.x
        // r.y = distance / normal.y - normal.x / normal.y * r.x
        // r.y = distance / normal.y - cotangent(normal) * r.x
        const cotangent = this.normal.cot();
        if (cotangent === null) {
            return [Number.NaN, Number.NaN];
        }
        return [-cotangent, this.distance / this.normal.y];
    }
    yForX(x) {
        const [slope, intercept] = this.xSlopeIntercept();
        return slope * x + intercept;
    }
    xForY(y) {
        // Given a y coordinate, return the x coordinate of the point on this line.
        // Derivation from the object's equation:
        // normal ⋅ r = distance
        // (normal.x * r.x + normal.y * r.y) = distance
        // normal.x * r.x = distance - normal.y * r.y
        // r.x = distance / normal.x - normal.y / normal.x * r.y
        // r.x = distance / normal.x - tangent(normal) * r.y
        const tangent = this.normal.tan();
        if (tangent === null) {
            return Number.NaN;
        }
        return this.distance / this.normal.x - tangent * y;
    }
    intersection(rhs) {
        // Given two lines, return the point of intersection.
        // Check special cases:
        if ((this.isVerticalLine() && rhs.isVerticalLine()) || (this.isHorizontalLine() && rhs.isHorizontalLine())) {
            return null;
        }
        if (this.isVerticalLine()) {
            const x = this.distance * this.normal.x;
            let y;
            if (rhs.isHorizontalLine()) {
                y = rhs.distance * rhs.normal.y;
            }
            else {
                y = rhs.yForX(x);
            }
            if (isNaN(y)) {
                return null;
            }
            return write(x, y);
        }
        if (this.isHorizontalLine()) {
            const y = this.distance * this.normal.y;
            let x;
            if (rhs.isVerticalLine()) {
                x = rhs.distance * rhs.normal.x;
            }
            else {
                x = rhs.xForY(y);
            }
            return write(x, y);
        }
        if (rhs.isVerticalLine()) {
            const x = rhs.distance * rhs.normal.x;
            const y = this.yForX(x);
            return write(x, y);
        }
        if (rhs.isHorizontalLine()) {
            const y = rhs.distance * rhs.normal.y;
            const x = this.xForY(y);
            return write(x, y);
        }
        // Derivation from the objects' slope-intercept equations:
        // y = m1 * x + b1 = m2 * x + b2
        // x = (b2 - b1) / (m1 - m2)
        const [m1, b1] = this.xSlopeIntercept();
        const [m2, b2] = rhs.xSlopeIntercept();
        if (m1 === m2) {
            return null;
        }
        const x = (b2 - b1) / (m1 - m2);
        const y = m1 * x + b1;
        return write(x, y);
    }
}
export class LineBands {
    normal;
    distance;
    spacing;
    // This line class represents a set of regularly-spaced, parallel, infinite lines
    // in 2D space as:
    //   a unit normal;
    //   a distance from the origin; and
    //   a spacing between lines;
    // The equation for points r on these lines is
    // normal ⋅ r = distance + k * spacing
    // where k is an integer indexing over the different lines.
    static make(normal, distance, spacing) {
        normal.normalize();
        return new LineBands(normal, distance, spacing);
    }
    constructor(normal, distance, spacing) {
        this.normal = normal;
        this.distance = distance;
        this.spacing = spacing;
        if (Math.abs(normal.magnitude() - 1) > 1e-7) {
            throw new Error("bad normal vector.");
        }
    }
    kthLine(k) {
        return new Line(this.normal, this.distance + k * this.spacing);
    }
    kForPoint(r) {
        // Find an index k, not necessarily an integer, such that r falls on the kth line.
        // (This kth line will often not be one of the lines in the set.)
        // normal ⋅ r = distance + k * spacing
        // k = (normal ⋅ r - distance) / spacing
        return (this.normal.dot(r) - this.distance) / this.spacing;
    }
    kRangeForBox(box) {
        let leastK = Infinity, greatestK = -Infinity;
        const test = new Standalone(0, 0);
        for (let corner of box.corners()) {
            corner(test);
            const k = this.kForPoint(test);
            leastK = Math.min(leastK, k);
            greatestK = Math.max(greatestK, k);
        }
        return [leastK, greatestK];
    }
}
export function* bandLinesInsideBox(bands, box) {
    const [k0, k1] = bands.kRangeForBox(box);
    for (let k of range(Math.ceil(k0), Math.floor(k1) + 1)) {
        yield bands.kthLine(k);
    }
}
export class AxisAlignedBoundingBox2D {
    x0;
    x1;
    y0;
    y1;
    constructor(x0, x1, y0, y1) {
        this.x0 = x0;
        this.x1 = x1;
        this.y0 = y0;
        this.y1 = y1;
        if (x0 > x1 || y0 > y1) {
            throw new Error("bad bounding box.");
        }
    }
    xInBox(x) {
        return this.x0 <= x && x <= this.x1;
    }
    yInBox(y) {
        return this.y0 <= y && y <= this.y1;
    }
    *corners() {
        yield write(this.x0, this.y0);
        yield write(this.x1, this.y0);
        yield write(this.x1, this.y1);
        yield write(this.x0, this.y1);
    }
    clipLine(l) {
        const endpoints = [];
        for (let x of [this.x0, this.x1]) {
            const y = l.yForX(x);
            if (this.yInBox(y)) {
                endpoints.push({ x, y });
            }
        }
        for (let y of [this.y0, this.y1]) {
            const x = l.xForY(y);
            if (this.xInBox(x)) {
                endpoints.push({ x, y });
            }
        }
        if (endpoints.length < 2) {
            return null;
        }
        return [write(endpoints[0]), write(endpoints[1])];
    }
}
export const AABB = AxisAlignedBoundingBox2D;
