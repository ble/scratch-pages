export class Game24Card {
    values;
    constructor(values) {
        this.values = values;
    }
    toString() {
        return this.values.toString();
    }
    #solutions;
    get solutions() {
        if (this.#solutions === undefined) {
            const operators = [addStar, subStar, mulStar, divStar];
            const operands = this.values.map(v => Rational.of(v, 1));
            const applications = Array.from(applyOutStar(operators, operands));
            const ordered = applications.sort((a, b) => a.evalFloat() - b.evalFloat());
            this.#solutions = collectKVE(ordered.map(x => [x.eval(), x]));
        }
        return this.#solutions;
    }
}
export function lcm(a, b) {
    return a * b / gcd(a, b);
}
export function gcd(a, b) {
    while (b !== 0) {
        const t = b;
        b = a % b;
        a = t;
    }
    return a;
}
export class Rational {
    numerator;
    denominator;
    static #interned = new Map();
    static of(n, d) {
        const g = gcd(n, d);
        n /= g;
        d /= g;
        Rational.#interned.set(JSON.stringify([n, d]), new Rational(n, d));
        return Rational.#interned.get(JSON.stringify([n, d]));
    }
    constructor(n, d) {
        if (d === 0) {
            throw new Error('Denominator cannot be zero');
        }
        const g = gcd(n, d);
        this.numerator = n / g;
        this.denominator = d / g;
    }
    toSExp() {
        if (this.denominator === 1) {
            return this.numerator.toString();
        }
        return `(/ ${this.numerator} ${this.denominator})`;
    }
    eval() {
        return this;
    }
    evalFloat() {
        return this.numerator / this.denominator;
    }
    add(r) {
        const d = lcm(this.denominator, r.denominator);
        const n = this.numerator * (d / this.denominator) + r.numerator * (d / r.denominator);
        return new Rational(n, d);
    }
    sub(r) {
        const d = lcm(this.denominator, r.denominator);
        const n = this.numerator * (d / this.denominator) - r.numerator * (d / r.denominator);
        return new Rational(n, d);
    }
    mul(r) {
        const n = this.numerator * r.numerator;
        const d = this.denominator * r.denominator;
        return new Rational(n, d);
    }
    div(r) {
        const n = this.numerator * r.denominator;
        const d = this.denominator * r.numerator;
        return new Rational(n, d);
    }
}
export function* everySubset(operands) {
    const ops = Array.from(operands);
    for (let i = 0; i < 1 << ops.length; i++) {
        const selected = ops.filter((_, j) => i & 1 << j);
        const remaining = ops.filter((_, j) => !(i & 1 << j));
        yield { operands: selected, remaining };
    }
}
export function* firstOperandSubsets(operands) {
    const ops = Array.from(operands);
    for (let i = 0; i < ops.length; i++) {
        const firstOp = ops[i];
        const rest = ops.slice();
        rest.splice(i, 1);
        for (let { operands, remaining } of everySubset(rest)) {
            operands.unshift(firstOp);
            yield { operands, remaining };
        }
    }
}
function* filterIterable(iterable, predicate) {
    for (const t of iterable) {
        if (predicate(t)) {
            yield t;
        }
    }
}
function isApplicationOfOpStar(op, exp) {
    return exp instanceof ApplicationStar && exp.op === op;
}
function anyApplicationOfOpStar(op, exps) {
    return exps.filter(isApplicationOfOpStar.bind(null, op)).length > 0;
}
export const addStar = (...operands) => {
    let result = operands[0];
    for (let i = 1; i < operands.length; i++) {
        result = result.add(operands[i]);
    }
    return result;
};
addStar.operandSets = function (operands) {
    let operandSets = everySubset(operands);
    operandSets = filterIterable(operandSets, (s) => s.operands.length >= 2);
    operandSets = filterIterable(operandSets, (s) => !anyApplicationOfOpStar(addStar, s.operands));
    return operandSets;
};
addStar.opName = '+';
export const mulStar = (...operands) => {
    let result = operands[0];
    for (let i = 1; i < operands.length; i++) {
        result = result.mul(operands[i]);
    }
    return result;
};
mulStar.operandSets = function (operands) {
    let operandSets = everySubset(operands);
    operandSets = filterIterable(operandSets, (s) => s.operands.length >= 2);
    operandSets = filterIterable(operandSets, (s) => !anyApplicationOfOpStar(mulStar, s.operands));
    return operandSets;
};
mulStar.opName = '*';
export const subStar = (...operands) => {
    let result = operands[0];
    for (let i = 1; i < operands.length; i++) {
        result = result.sub(operands[i]);
    }
    return result;
};
subStar.operandSets = function (operands) {
    let operandSets = firstOperandSubsets(operands);
    operandSets = filterIterable(operandSets, (s) => s.operands.length >= 2);
    operandSets = filterIterable(operandSets, (s) => !anyApplicationOfOpStar(subStar, s.operands));
    return operandSets;
};
subStar.opName = '-';
export const divStar = (...operands) => {
    let result = operands[0];
    for (let i = 1; i < operands.length; i++) {
        result = result.div(operands[i]);
    }
    return result;
};
divStar.operandSets = function (operands) {
    let operandSets = firstOperandSubsets(operands);
    operandSets = filterIterable(operandSets, (s) => s.operands.length >= 2);
    operandSets = filterIterable(operandSets, (s) => s.operands.filter((item, index) => (index > 0 && item.eval().numerator == 0)).length === 0);
    operandSets = filterIterable(operandSets, (s) => !anyApplicationOfOpStar(divStar, s.operands));
    return operandSets;
};
divStar.opName = '/';
export function* singleApplicationsStar(operators, operands) {
    for (const op of operators) {
        for (const { operands: toApply, remaining } of op.operandSets(operands)) {
            remaining.unshift(new ApplicationStar(op, toApply));
            yield remaining;
        }
    }
}
export function* applyOutStar(operators, operands) {
    const operandGroups = [operands];
    while (operandGroups.length > 0) {
        const group = operandGroups.shift();
        if (group.length === 1) {
            yield group[0];
            continue;
        }
        for (const generatedGroup of singleApplicationsStar(operators, group)) {
            operandGroups.push(generatedGroup);
        }
    }
}
export class ApplicationStar {
    op;
    operands;
    constructor(op, operands) {
        this.op = op;
        this.operands = operands;
    }
    toSExp() {
        return `(${this.op.opName} ${this.operands.map(o => o.toSExp()).join(' ')})`;
    }
    eval() {
        return this.op(...this.operands.map(o => o.eval()));
    }
    evalFloat() {
        const exact = this.eval();
        return exact.numerator / exact.denominator;
    }
}
;
function* pairsCommutativeOp(operands) {
    const ops = Array.from(operands);
    for (let i = 0; i < ops.length; i++) {
        for (let j = i + 1; j < ops.length; j++) {
            const opsRemaining = ops.slice().filter((_, k) => k !== i && k !== j);
            yield [ops[i], ops[j], opsRemaining];
        }
    }
}
function* pairs(operands) {
    const ops = Array.from(operands);
    for (let i = 0; i < ops.length; i++) {
        for (let j = 0; j < ops.length; j++) {
            if (i === j)
                continue;
            const opsRemaining = ops.slice().filter((_, k) => k !== i && k !== j);
            yield [ops[i], ops[j], opsRemaining];
        }
    }
}
export const add = (a, b) => a.add(b);
add.pairs = pairsCommutativeOp;
add.opName = '+';
export const sub = (a, b) => a.sub(b);
sub.pairs = pairs;
sub.opName = '-';
export const mul = (a, b) => a.mul(b);
mul.pairs = pairsCommutativeOp;
mul.opName = '*';
export const div = (a, b) => a.div(b);
div.pairs = function* (operands) {
    for (let [lhs, rhs, remaining] of pairs(operands)) {
        if (rhs.eval().numerator === 0) {
            continue;
        }
        yield [lhs, rhs, remaining];
    }
};
div.opName = '/';
export class Application {
    op;
    a;
    b;
    constructor(op, a, b) {
        this.op = op;
        this.a = a;
        this.b = b;
    }
    toSExp() {
        return `(${this.op.opName} ${this.a.toSExp()} ${this.b.toSExp()})`;
    }
    eval() {
        return this.op(this.a.eval(), this.b.eval());
    }
    evalFloat() {
        return this.eval().evalFloat();
    }
    toString() {
        return `(${this.a} ${this.op.opName} ${this.b})`;
    }
}
export function applications(operators, operands) {
    const apps = [];
    for (const op of operators) {
        for (const [a, b] of op.pairs(operands.map(o => o.eval()))) {
            apps.push(new Application(op, a, b));
        }
    }
    return apps;
}
export function* singleApplications(operators, operands) {
    for (const op of operators) {
        for (const [lhs, rhs, remaining] of op.pairs(operands)) {
            remaining.unshift(new Application(op, lhs, rhs));
            yield remaining;
        }
    }
}
export function* applyOut(operators, operands) {
    const operandGroups = [operands];
    while (operandGroups.length > 0) {
        const group = operandGroups.shift();
        if (group.length === 1) {
            yield group[0];
            continue;
        }
        for (const generatedGroup of singleApplications(operators, group)) {
            operandGroups.push(generatedGroup);
        }
    }
}
export function collectKVE(iterable) {
    const map = new Map();
    for (const [k, v] of iterable) {
        if (map.has(k)) {
            map.get(k).push(v);
        }
        else {
            map.set(k, [v]);
        }
    }
    return map;
}
