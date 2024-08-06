;
export class TwoShorts {
    #value;
    static #shortInRange(x) {
        return -0x8000 <= x && x <= 0x7fff;
    }
    static #assertInRange(...x) {
        if (x.some(x => !TwoShorts.#shortInRange(x))) {
            throw new RangeError('TwoShorts values must be between -32768 and 32767');
        }
    }
    constructor(a, b) {
        TwoShorts.#assertInRange(a, b);
        this.#value = (a << 16) | (b & 0xffff);
    }
    get [0]() {
        return (this.#value >> 16);
    }
    set [0](value) {
        TwoShorts.#assertInRange(value);
        this.#value = (value << 16) | (this.#value & 0xffff);
    }
    get [1]() {
        let result = this.#value & 0xffff;
        if (result & 0x8000) {
            result |= 0xffff0000;
        }
        return result;
    }
    set [1](value) {
        TwoShorts.#assertInRange(value);
        this.#value = (this.#value & 0xffff0000) | (value & 0xffff);
    }
    get length() {
        return 2;
    }
    toString() {
        return `[${this[0]}, ${this[1]}]`;
    }
    toJSON() {
        return [this[0], this[1]];
    }
    *[Symbol.iterator]() {
        yield this[0];
        yield this[1];
    }
}
