class ActuatorVariety {
    min;
    max;
    modal;
    constructor(min, max, modal) {
        this.min = min;
        this.max = max;
        this.modal = modal;
    }
}
class Minihistogram {
    counts = {};
}
const warn = console.warn.bind(console);
class valueOnlyButton {
    value;
    constructor(value) {
        this.value = value;
    }
    get pressed() {
        return this.value > 0;
    }
    get touched() {
        return this.value > 0;
    }
}
function valueOnlyButtons(values) {
    const proxy = new Proxy(values, { get: (target, prop) => {
            if (prop === "length") {
                return target.length;
            }
            if (typeof prop === "symbol") {
                return undefined;
            }
            const index = Number.parseInt(prop);
            if (0 <= index && index < target.length && Number.isInteger(index)) {
                return new valueOnlyButton(target[index]);
            }
            return undefined;
        } });
    return proxy;
}
class padState {
    buf;
    ix;
    constructor(buf, ix) {
        this.buf = buf;
        this.ix = ix;
    }
    get timestamp() {
        return this.buf.timestamps[this.ix];
    }
    #axes;
    #buttons;
    get axes() {
        if (!this.#axes) {
            this.#axes = this.buf.axesAt(this.ix);
        }
        return this.#axes;
    }
    get buttons() {
        if (!this.#buttons) {
            this.#buttons = valueOnlyButtons(this.buf.buttonsAt(this.ix));
        }
        return this.#buttons;
    }
}
export class HifiBuffer {
    width;
    length;
    buffer;
    timestamps;
    ix;
    nSampled;
    nAxes;
    nButtons;
    constructor(width, length) {
        this.width = width;
        this.length = length;
        this.buffer = new Float32Array(width * length);
        this.timestamps = new Float64Array(length);
        this.ix = 0;
        this.nSampled = 0;
        this.nAxes = null;
        this.nButtons = null;
    }
    record(g) {
        if (this.nAxes === null) {
            this.nAxes = g.axes.length;
        }
        else if (this.nAxes !== g.axes.length) {
            warn(`Gamepad axis count mismatch: ${this.nAxes} !== ${g.axes.length}`);
        }
        if (this.nButtons === null) {
            this.nButtons = g.buttons.length;
        }
        else if (this.nButtons !== g.buttons.length) {
            warn(`Gamepad button count mismatch: ${this.nButtons} !== ${g.buttons.length}`);
        }
        const padWidth = g.axes.length + g.buttons.length;
        if (padWidth !== this.width) {
            warn(`Gamepad width mismatch: ${padWidth} !== ${this.width}`);
        }
        const width = Math.min(this.width, padWidth);
        this.timestamps[this.ix] = g.timestamp;
        let jx = 0;
        for (; jx < this.nAxes && jx < g.axes.length; jx++) {
            this.buffer[jx + this.ix * this.width] = g.axes[jx];
        }
        jx = this.nAxes;
        for (; jx < this.width && jx < (this.nAxes + g.buttons.length); jx++) {
            this.buffer[jx + this.ix * this.width] = g.buttons[jx - this.nAxes].value;
        }
        this.ix++;
        this.nSampled++;
        if (this.ix >= this.length) {
            this.ix = 0;
        }
    }
    get lastTimestamp() {
        if (this.nSampled === 0) {
            return NaN;
        }
        const index = (this.ix - 1 + this.length) % this.length;
        return this.timestamps[index];
    }
    get n() {
        return this.nSampled;
    }
    #read(sample, actuatorIx) {
        return this.buffer[actuatorIx + sample * this.width];
    }
    timestampAt(ix) {
        return this.timestamps[ix];
    }
    axesAt(ix) {
        return this.buffer.subarray(ix * this.width, ix * this.width + this.nAxes);
    }
    buttonsAt(ix) {
        return this.buffer.subarray(ix * this.width + this.nAxes, ix * this.width + this.width);
    }
    pastState(delta) {
        if (delta > this.nSampled || delta > this.length) {
            throw new RangeError(`Cannot read ${delta} samples back.`);
        }
        return new padState(this, (this.ix - delta - 1 + this.length) % this.length);
    }
    observe() {
        const lengthToRead = Math.min(this.nSampled, this.length);
        const varieties = [];
        for (let ix = 0; ix < this.width; ix++) {
            varieties.push(new ActuatorVariety(Infinity, -Infinity));
        }
        for (let jx = 0; jx < lengthToRead; jx++) {
            for (let ix = 0; ix < this.width; ix++) {
                const value = this.#read(jx, ix);
                varieties[ix].min = Math.min(varieties[ix].min, value);
                varieties[ix].max = Math.max(varieties[ix].max, value);
            }
        }
        const result = { axes: varieties.slice(0, this.nAxes), buttons: varieties.slice(this.nAxes) };
        return result;
    }
}
export function buttonsActive(g) {
    const result = [];
    for (let ix = 0; ix < g.buttons.length; ix++) {
        if (g.buttons[ix].value != 0) {
            result.push(ix);
        }
    }
    return result;
}
export function summarizePadVariety(variety) {
    const numeric = (n) => n.toFixed(2);
    const quick = (a) => `[${numeric(a.min)}, ${numeric(a.max)}]`;
    const axesPart = variety.axes.map((a) => quick(a)).join(", ");
    const buttonsPart = variety.buttons.map((a) => quick(a)).join(", ");
    return `Axes (${axesPart}), Buttons (${buttonsPart})`;
}
export function axes2UnitCircle(g, ixX, ixY) {
    const x = g.axes[ixX], y = g.axes[ixY], r = Math.max(1, Math.hypot(g.axes[ixX], g.axes[ixY]));
    if (Math.abs(x) > 1 || Math.abs(y) > 1) {
        warn(`Gamepad axis value >1: (${x}, ${y})`);
    }
    return { x: x / r, y: y / r };
}
;
export function alphaBeta(oldP, newP, halfLifeMillis, deltaMillis) {
    const alpha = Math.exp(-Math.LN2 * deltaMillis / halfLifeMillis), beta = 1 - alpha;
    return (dest) => {
        return dest.setTo(newP).mulAssign(beta).addAssignScaled(oldP, alpha);
    };
}
export function diffButtonValues(before, after) {
    const changes = [], bBefore = before.buttons, bAfter = after.buttons, n = Math.min(bBefore.length, bAfter.length);
    for (let ix = 0; ix < n; ix++) {
        const delta = bAfter[ix].value - bBefore[ix].value;
        if (delta !== 0) {
            // 0: index, 1: delta, 2: before, 3: after
            changes.push({ index: ix, delta, before: bBefore[ix].value, after: bAfter[ix].value });
        }
    }
    return changes;
}
