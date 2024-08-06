export class Point2DReadonlyOps {
    dot(rhs) {
        return this.x * rhs.x + this.y * rhs.y;
    }
    dotUnit(theta) {
        return this.x * Math.cos(theta) + this.y * Math.sin(theta);
    }
    magnitude() {
        return Math.hypot(this.x, this.y);
    }
    tan() {
        if (this.x === 0) {
            return null;
        }
        return this.y / this.x;
    }
    cot() {
        if (this.y === 0) {
            return null;
        }
        return this.x / this.y;
    }
    distanceTo(rhs) {
        return Math.hypot(this.x - rhs.x, this.y - rhs.y);
    }
    toJSON() {
        return { x: this.x, y: this.y };
    }
}
export const Point2DWriter = {
    write(sources, destination) {
        for (let source of sources) {
            source(destination.extend());
        }
    },
    writeWithRefs(sources, destination) {
        const result = [];
        for (let source of sources) {
            result.push(source(destination.extend()));
        }
        return result;
    }
};
export function write(srcOrX, y) {
    if (typeof srcOrX === "number" && y !== undefined) {
        return (destination) => {
            destination.x = srcOrX;
            destination.y = y;
            return destination;
        };
    }
    else {
        return (destination) => {
            destination.setTo(srcOrX);
            return destination;
        };
    }
}
export class Point2DOps extends Point2DReadonlyOps {
    setTo(arg1, y) {
        if (typeof arg1 === 'number') {
            this.x = arg1;
            this.y = y;
        }
        else {
            this.x = arg1.x;
            this.y = arg1.y;
        }
        return this;
    }
    setLinearCombination(terms) {
        this.setOrigin();
        for (const [scale, point] of terms) {
            this.addAssignScaled(point, scale);
        }
        return this;
    }
    setUnitCircle(theta) {
        this.x = Math.cos(theta);
        this.y = Math.sin(theta);
        return this;
    }
    setPolar(r, theta) {
        this.x = r * Math.cos(theta);
        this.y = r * Math.sin(theta);
        return this;
    }
    setOrigin() {
        this.x = 0;
        this.y = 0;
        return this;
    }
    addPolar(r, theta) {
        this.x += r * Math.cos(theta);
        this.y += r * Math.sin(theta);
        return this;
    }
    addAssign(rhs) {
        this.x += rhs.x;
        this.y += rhs.y;
        return this;
    }
    addAssignScaled(rhs, scale) {
        this.x += rhs.x * scale;
        this.y += rhs.y * scale;
        return this;
    }
    subAssign(rhs) {
        this.x -= rhs.x;
        this.y -= rhs.y;
        return this;
    }
    mulAssign(rhs) {
        this.x *= rhs;
        this.y *= rhs;
        return this;
    }
    divAssign(rhs) {
        this.x /= rhs;
        this.y /= rhs;
        return this;
    }
    rot90() {
        const x = this.x;
        this.x = -this.y;
        this.y = x;
        return this;
    }
    normalize() {
        const scale = Math.hypot(this.x, this.y);
        return this.divAssign(scale);
    }
    transform(m) {
        const pt = m.transformPoint(this);
        this.x = pt.x;
        this.y = pt.y;
        return this;
    }
}
export class Standalone extends Point2DOps {
    x;
    y;
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
        this.x = x;
        this.y = y;
    }
    static origin() {
        return new Standalone(0, 0);
    }
}
export class FloatBacked extends Point2DOps {
    backing;
    offset;
    constructor(backing, offset) {
        super();
        this.backing = backing;
        this.offset = offset;
    }
    get x() {
        return this.backing[2 * this.offset];
    }
    set x(value) {
        this.backing[2 * this.offset] = value;
    }
    get y() {
        return this.backing[2 * this.offset + 1];
    }
    set y(value) {
        this.backing[2 * this.offset + 1] = value;
    }
}
export class Points2DFloatBacked {
    capacity;
    backing;
    #length;
    constructor(capacity) {
        this.capacity = capacity;
        this.#length = 0;
        this.backing = new Float32Array(capacity * 2);
    }
    reset() {
        this.#length = 0;
    }
    get offset() {
        return this.#length;
    }
    set offset(value) {
        if (value < 0 || value >= this.capacity) {
            throw new Error(`offset ${value} out of bounds`);
        }
        this.#length = value;
    }
    arrayLike(ixLow = 0, ixHigh) {
        const highIndex = () => ((ixHigh !== undefined) ? ixHigh : this.#length);
        return new Proxy(this, {
            get(target, property, receiver) {
                if (property === 'toJSON') {
                    return function () {
                        const result = [];
                        for (let ix = ixLow; ix < highIndex(); ix++) {
                            result.push(target.item(ix).toJSON());
                        }
                        return result;
                    };
                }
                if (property === 'length') {
                    return highIndex() - ixLow;
                }
                if (property === 'slice') {
                    return function (start = 0, end) {
                        return target.arrayLike(start + ixLow, end ? end + ixLow : highIndex());
                    };
                }
                if (typeof property === 'symbol') {
                    if (property === Symbol.iterator) {
                        return function* () {
                            for (let ix = ixLow; ix < highIndex(); ix++) {
                                yield target.item(ix);
                            }
                        };
                    }
                    return undefined;
                }
                const index = Number.parseInt(property);
                return target.item(index + ixLow);
            }
        });
    }
    extend() {
        this.create(0, 0);
        return this.tail;
    }
    addOne({ x, y }) {
        this.create(x, y);
        return this;
    }
    put(value) {
        this.extend().setTo(value);
    }
    add({ x, y }) {
        return this.create(x, y);
    }
    create(x, y) {
        if (this.#length >= this.capacity) {
            throw new Error('out of capacity');
        }
        this.backing[this.#length * 2] = x;
        this.backing[this.#length * 2 + 1] = y;
        this.#length++;
        return new FloatBacked(this.backing, this.#length - 1);
    }
    get tail() {
        return this.item(this.#length - 1);
    }
    get length() {
        return this.#length;
    }
    #item(index) {
        if (index < 0 || index >= this.#length) {
            throw new Error(`index ${index} out of bounds`);
        }
        return new FloatBacked(this.backing, index);
    }
    item(index) {
        return this.#item(index);
    }
    *[Symbol.iterator]() {
        const length = this.#length;
        for (let i = 0; i < length; i++) {
            yield this.item(i);
        }
    }
    *o1() {
        const length = this.#length;
        const temp = this.#item(0);
        for (let i = 0; i < length; i++) {
            temp.offset = i;
            yield temp;
        }
    }
}
