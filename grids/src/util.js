export function range(arg0, arg1, arg2) {
    const start = arg1 === undefined ? 0 : arg0, end = arg1 === undefined ? arg0 : arg1, step = arg2 === undefined ? 1 : arg2;
    const result = [];
    for (let ix = start; ix < end; ix += step) {
        result.push(ix);
    }
    return result;
}
export function* choose2(items) {
    for (let ix = 0; ix < items.length; ix++) {
        for (let jx = ix + 1; jx < items.length; jx++) {
            yield [items[ix], items[jx]];
        }
    }
}
export function* cartesian(xs, ys) {
    xs = Array.from(xs);
    ys = Array.from(ys);
    for (let x of xs) {
        for (let y of ys) {
            yield [x, y];
        }
    }
}
export function* enumerate(xs) {
    let ix = 0;
    for (let x of xs) {
        yield [ix, x];
        ix++;
    }
}
export function* zip(xs, ys) {
    const xit = xs[Symbol.iterator]();
    const yit = ys[Symbol.iterator]();
    while (true) {
        const x = xit.next();
        const y = yit.next();
        if (x.done || y.done) {
            break;
        }
        yield [x.value, y.value];
    }
}
export function flipMap(map) {
    const result = new Map();
    for (let [k, v] of map) {
        if (result.has(v)) {
            throw new Error("Map is not invertible.");
        }
        result.set(v, k);
    }
    return result;
}
export function roundToMultiple(value, multiple) {
    return Math.round(value / multiple) * multiple;
}
export function parity(values) {
    return (values.reduce((acc, v) => {
        if (Math.round(v) !== v) {
            throw new Error("Parity only works on integers.");
        }
        return acc + v;
    }, 0) % 2 + 2) % 2;
}
export function fromPx(length) {
    if (length.endsWith('px')) {
        return parseFloat(length.slice(0, length.length - 2));
    }
    return 0;
}
export function indexOfMaxAbsolute(values) {
    let maxIndex = -1;
    let maxValue = 0;
    for (let ix = 0; ix < values.length; ix++) {
        const value = Math.abs(values[ix]);
        if (value > maxValue) {
            maxIndex = ix;
            maxValue = value;
        }
    }
    return maxIndex;
}
export function indexOfMinAbsolute(values) {
    let minIndex = -1;
    let minValue = Infinity;
    for (let ix = 0; ix < values.length; ix++) {
        const value = Math.abs(values[ix]);
        if (value < minValue) {
            minIndex = ix;
            minValue = value;
        }
    }
    return minIndex;
}
export function getNonContentWidthAndHeight(element) {
    const style = window.getComputedStyle(element);
    const widthKeys = ['borderLeftWidth', 'borderRightWidth', 'paddingLeft', 'paddingRight'];
    const heightKeys = ['borderTopWidth', 'borderBottomWidth', 'paddingTop', 'paddingBottom'];
    return {
        width: widthKeys.map(k => fromPx(style[k])).reduce((a, b) => a + b),
        height: heightKeys.map(k => fromPx(style[k])).reduce((a, b) => a + b)
    };
}
export function getContentWidthAndHeight(element) {
    const style = window.getComputedStyle(element);
    const widthKeys = ['borderLeftWidth', 'borderRightWidth', 'paddingLeft', 'paddingRight'];
    const heightKeys = ['borderTopWidth', 'borderBottomWidth', 'paddingTop', 'paddingBottom'];
    return {
        width: fromPx(style.width) - widthKeys.map(k => fromPx(style[k])).reduce((a, b) => a + b),
        height: fromPx(style.height) - heightKeys.map(k => fromPx(style[k])).reduce((a, b) => a + b)
    };
}
export function stringifyModerate(data) {
    if (data === undefined ||
        data === null ||
        typeof data === 'boolean' ||
        typeof data === 'number' ||
        typeof data === 'string') {
        return JSON.stringify(data);
    }
    if (Array.isArray(data)) {
        const lines = ['['];
        data.forEach((v, ix) => {
            const lastLine = ix === data.length - 1;
            const line = `  ${JSON.stringify(v)}${lastLine ? ',' : ''}`;
            lines.push(line);
        });
        lines.push(']');
        return lines.join('\n');
    }
    else if (typeof data === 'object') {
        const lines = ['{'];
        const keys = Object.keys(data);
        keys.forEach((k, ix) => {
            const lastLine = ix === keys.length - 1;
            const line = `  ${k}: ${JSON.stringify(data[k])}${lastLine ? ',' : ''}`;
            lines.push(line);
        });
        lines.push('}');
        return lines.join('\n');
    }
    return JSON.stringify(data, null, 2);
}
export function least(xs) {
    let leastValue = Infinity;
    let leastIndex = -1;
    for (let [ix, x] of enumerate(xs)) {
        if (x < leastValue) {
            leastValue = x;
            leastIndex = ix;
        }
    }
    return { value: leastValue, index: leastIndex };
}
export function greatest(xs) {
    let greatestValue = -Infinity;
    let leastIndex = -1;
    for (let [ix, x] of enumerate(xs)) {
        if (x > greatestValue) {
            greatestValue = x;
            leastIndex = ix;
        }
    }
    return { value: greatestValue, index: leastIndex };
}
