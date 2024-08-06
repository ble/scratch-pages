import { alphaBeta, axes2UnitCircle, diffButtonValues, HifiBuffer } from '../gamepad_buffer.js';
import { augmentButtonDiffs, vendorMaps } from '../gamepad_mapping.js';
import { LineSegments } from '../LineSegments.js';
import { Points2DFloatBacked, Standalone } from '../Point2D.js';
function pathStar(ctx, center, scratch, n, k = 2, rho = 50, theta = 0) {
    const delta = 2 * k * Math.PI / n;
    for (let ix = 0, angle = theta; ix < n + 1; ix++, angle += delta) {
        scratch.setUnitCircle(angle).mulAssign(rho).addAssign(center);
        if (ix === 0) {
            ctx.moveTo(scratch.x, scratch.y);
        }
        else {
            ctx.lineTo(scratch.x, scratch.y);
        }
    }
}
class Draw {
    lines;
    flags;
    isDragging = false;
    constructor(lines, flags) {
        this.lines = lines;
        this.flags = flags;
    }
    disengage() { this.isDragging = false; }
    engage() { this.isDragging = false; }
    pointerDown(e) {
        this.isDragging = true;
        this.lines.moveTo({ x: e.pageX, y: e.pageY });
        this.flags.needsReset = true;
    }
    pointerUp(e) {
        this.isDragging = false;
    }
    pointerMove(e) {
        if (this.isDragging) {
            this.lines.lineTo({ x: e.pageX, y: e.pageY });
            this.flags.needsReset = true;
        }
    }
}
class Symmetry {
    flags;
    #backing = new Points2DFloatBacked(5);
    p0 = this.#backing.extend();
    p1 = this.#backing.extend();
    normal = this.#backing.extend();
    midpoint = this.#backing.extend();
    scratch = this.#backing.extend();
    #angle = 90;
    #matrix = new DOMMatrix();
    isDragging = false;
    constructor(flags) {
        this.flags = flags;
        this.p0.setTo(0, 0);
        this.p1.setTo(0, 1);
    }
    // #calc() {
    //   this.normal.setTo(this.p1).subAssign(this.p0).rot90().normalize();
    //   this.midpoint.setTo(this.p0).addAssign(this.p1).mulAssign(0.5);
    //   this.#angle = Math.atan2(this.p1.y - this.p0.y, this.p1.x - this.p0.x) * 180 / Math.PI;
    //   this.#matrix = new DOMMatrix();
    //   this.#matrix.translateSelf(this.midpoint.x, this.midpoint.y);
    //   this.#matrix.rotateSelf(this.#angle);
    //   this.#matrix.scaleSelf(1, -1);
    //   this.#matrix.rotateSelf(-this.#angle);
    //   this.#matrix.translateSelf(-this.midpoint.x, -this.midpoint.y);
    // }
    pathSymmetries(ctx, segments) {
        if (!this.flags.doSymmetry) {
            return;
        }
        const matrixAsTransform = (matrix) => (pIn, pOut) => { pOut.setTo(pIn).transform(matrix); };
        if (this.flags.doReflect) {
            const matrix = this.calcMatrix(true, this.flags.nRotational, 0);
            segments.pathWithTransform(ctx, matrixAsTransform(matrix));
        }
        if (this.flags.doRotate) {
            for (let k = 1; k < this.flags.nRotational; k++) {
                const matrix = this.calcMatrix(false, this.flags.nRotational, k);
                segments.pathWithTransform(ctx, matrixAsTransform(matrix));
                if (this.flags.doReflect) {
                    const matrix = this.calcMatrix(true, this.flags.nRotational, k);
                    segments.pathWithTransform(ctx, matrixAsTransform(matrix));
                }
            }
        }
    }
    calcMatrix(reflect, rotateN, rotateK) {
        const result = new DOMMatrix();
        const angle0 = Math.atan2(this.p1.y - this.p0.y, this.p1.x - this.p0.x) * 180 / Math.PI;
        this.midpoint.setTo(this.p0).addAssign(this.p1).mulAssign(0.5);
        result.translateSelf(this.midpoint.x, this.midpoint.y);
        result.rotateSelf(angle0);
        if (reflect) {
            result.scaleSelf(1, -1);
        }
        result.rotateSelf(rotateK * (360 / rotateN) - angle0);
        result.translateSelf(-this.midpoint.x, -this.midpoint.y);
        return result;
    }
    // transform(pIn: Point2DReadonly, pOut: Point2DOps) {
    //   const temp = this.#matrix.transformPoint(pIn);
    //   pOut.x = temp.x;
    //   pOut.y = temp.y;
    //   // const distanceFromLine = pOut.setTo(pIn).subAssign(this.midpoint).dot(this.normal);
    //   // pOut.setTo(pIn).addAssignScaled(this.normal, -2 * distanceFromLine);
    //   // this.scratch.setTo(pIn).subAssign(this.midpoint).mulAssign(-1);
    //   // pOut.setTo(this.midpoint).addAssign(this.scratch);
    // }
    disengage() {
        console.log(`Symmetry.disengage()`);
        this.isDragging = false;
        //this.flags.doReflect = false;
    }
    engage() {
        console.log(`Symmetry.engage()`);
        this.isDragging = false;
        this.flags.doSymmetry = false;
    }
    pointerDown(e) {
        console.log(`Symmetry.pointerDown()`);
        this.isDragging = true;
        this.p0.setTo(e.pageX, e.pageY);
        this.p1.setTo(e.pageX, e.pageY + 1);
        this.flags.needsReset = true;
        this.flags.doSymmetry = true;
        // this.#calc();
    }
    pointerMove(e) {
        console.log(`Symmetry.pointerMove(): isDragging = ${this.isDragging}`);
        if (this.isDragging) {
            this.p1.setTo(e.pageX, e.pageY);
            this.flags.needsReset = true;
            // this.#calc();
        }
    }
    pointerUp(e) {
        console.log(`Symmetry.pointerUp(): isDragging = ${this.isDragging}`);
        this.isDragging = false;
    }
}
const segments = [];
const flags = {
    needsReset: false,
    doSymmetry: false,
    doReflect: false,
    get doRotate() { return this.nRotational > 1; },
    nRotational: 3
};
const tools = new Map();
let activeTool = null;
segments.push(["pointer", new LineSegments()]);
tools.set("draw", new Draw(segments[segments.length - 1][1], flags));
tools.set("symmetry", new Symmetry(flags));
function setup() {
    const toolbar = document.querySelector('.toolbar');
    function readSelectedTool() {
        const toolbarForm = toolbar.querySelector('.toolbar form');
        for (let input of toolbarForm.elements) {
            if (input instanceof HTMLInputElement && input.name === "tool" && input.checked) {
                return input.value;
            }
        }
        return null;
    }
    activeTool = tools.get(readSelectedTool());
    activeTool.engage();
    flags.doReflect = toolbar.querySelector('input[name="reflect"]').checked;
    flags.nRotational = toolbar.querySelector('input[name="rotational"]').valueAsNumber;
    const parent = toolbar.parentElement;
    let isDragging = false;
    let grabbedPoint = null;
    let childOffset = null;
    toolbar.addEventListener('input', (e) => {
        if (!(e.target instanceof HTMLInputElement)) {
            return;
        }
        if (e.target.name === "reflect") {
            flags.doReflect = e.target.checked;
            flags.needsReset = true;
        }
        if (e.target.name !== "tool") {
            return;
        }
        const currentTool = activeTool;
        const nextTool = tools.get(e.target.value);
        if (currentTool === nextTool || !nextTool) {
            return;
        }
        if (currentTool) {
            currentTool.disengage();
        }
        nextTool.engage();
        activeTool = nextTool;
    });
    toolbar.addEventListener('pointerdown', (e) => {
        if (e.target instanceof HTMLInputElement && e.target.type === "range") {
            return;
        }
        if (isDragging) {
            isDragging = false;
            grabbedPoint = null;
            childOffset = null;
            return;
        }
        isDragging = true;
        const tgtBox = toolbar.getBoundingClientRect();
        grabbedPoint = new DOMPoint(e.clientX, e.clientY);
        const parentRect = parent.getBoundingClientRect();
        childOffset = new DOMPoint(tgtBox.left - parentRect.left, tgtBox.top - parentRect.top);
    });
    document.addEventListener('pointermove', (e) => {
        if (isDragging) {
            const left = e.clientX - grabbedPoint.x + childOffset.x;
            const top = e.clientY - grabbedPoint.y + childOffset.y;
            toolbar.style.left = `${left}px`;
            toolbar.style.top = `${top}px`;
            document.body.querySelector("h2").innerText = `(${left}, ${top})`;
        }
    });
    document.addEventListener('pointerup', () => {
        isDragging = false;
        grabbedPoint = null;
    });
    const rotational = document.querySelector("#rotational");
    rotational.addEventListener("input", () => {
        flags.nRotational = rotational.valueAsNumber;
        flags.needsReset = true;
    });
    const canvas = document.querySelector(".big-canvas");
    const body = document.body;
    let rect = document.body.getBoundingClientRect();
    let pRect = canvas.parentElement?.getBoundingClientRect();
    canvas.setAttribute("width", `${Math.round(rect.width)}`);
    canvas.setAttribute("height", `${Math.round(rect.height)}`);
    const cStyle = canvas.style;
    cStyle.left = `${-pRect.left}px`;
    cStyle.top = `${-pRect.top}px`;
    cStyle.width = `${rect.width}`;
    cStyle.height = `${rect.height}`;
    let ctx = canvas.getContext("2d");
    (function () {
        const s = tools.get("symmetry");
        s.p0.setTo(0, 0);
        s.p1.setTo(rect.width, rect.height);
        flags.doSymmetry = true;
        flags.needsReset = true;
    })();
    let draggingCanvas = false, lastPoint = null;
    // const filterDeltaControl = document.querySelector("#filter-delta") as HTMLInputElement;
    const lineWidthControl = document.querySelector("#line-width");
    let lineWidth = lineWidthControl.valueAsNumber;
    lineWidthControl.addEventListener("input", () => {
        lineWidth = lineWidthControl.valueAsNumber;
        lineWidth *= lineWidth;
        flags.needsReset = true;
    });
    canvas.addEventListener("pointerdown", (event) => {
        if (!activeTool) {
            return;
        }
        activeTool.pointerDown(event);
    });
    const handleUp = (event) => {
        if (!activeTool) {
            return;
        }
        activeTool.pointerUp(event);
    };
    body.addEventListener("pointerup", handleUp);
    // body.addEventListener("pointerleave", handleUp);
    // body.addEventListener("pointerout", handleUp);
    body.addEventListener("pointermove", (event) => {
        if (!activeTool) {
            return;
        }
        activeTool.pointerMove(event);
    });
    let rafCallback = function (timestamp) { };
    rafCallback = (function () {
        const gamepadController = new GamepadCtx(canvas.getBoundingClientRect(), (_) => {
            const s = new LineSegments();
            segments.push(["controller", s]);
            return s;
        });
        const scratch = Standalone.origin();
        return function rafCallback(timestamp) {
            const gamepads = navigator.getGamepads();
            const gamepadsPresent = Array.from(gamepads).filter(x => x);
            function pluralize(n, singular, plural = `${singular}s`) {
                return `${n} ${n === 1 ? singular : plural}`;
            }
            document.body.querySelector("h2").innerText = `${pluralize(gamepadsPresent.length, "gamepad")} present`;
            const needRedraw = flags.needsReset || gamepadController.gamepadStateUpdate(timestamp, gamepads);
            flags.needsReset = false;
            if (!needRedraw) {
                requestAnimationFrame(rafCallback);
                return;
            }
            ctx.save();
            try {
                ctx.strokeStyle = "#000";
                ctx.lineWidth = lineWidth;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                for (let [label, segment] of segments) {
                    ctx.beginPath();
                    segment.path(ctx);
                    const symmetry = tools.get("symmetry");
                    symmetry.pathSymmetries(ctx, segment);
                    ctx.stroke();
                }
                if (flags.doSymmetry) {
                    const symmetry = tools.get("symmetry");
                    const p0 = symmetry.p0;
                    const p1 = symmetry.p1;
                    ctx.strokeStyle = "#0f0";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p0.x, p0.y);
                    ctx.lineTo(p1.x, p1.y);
                    ctx.stroke();
                    if (flags.nRotational > 1) {
                        const q0 = Standalone.origin(), q1 = Standalone.origin();
                        ctx.strokeStyle = "#070";
                        for (let k = 1; k < flags.nRotational; k++) {
                            const matrix = symmetry.calcMatrix(false, flags.nRotational, k);
                            q0.setTo(p0).transform(matrix);
                            q1.setTo(p1).transform(matrix);
                            ctx.beginPath();
                            ctx.moveTo(q0.x, q0.y);
                            ctx.lineTo(q1.x, q1.y);
                            ctx.stroke();
                        }
                    }
                }
                ctx.strokeStyle = "#f00";
                ctx.lineWidth = 2;
                ctx.lineJoin = "round";
                ctx.lineCap = "round";
                ctx.beginPath();
                pathStar(ctx, gamepadController.startPoint, scratch, 5, 2, 10, Math.PI / 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.strokeStyle = "#ff0";
                pathStar(ctx, gamepadController.endpoint, scratch, 5, 2, 10, Math.PI * (1 / 2 + 1 / 5));
                ctx.stroke();
            }
            finally {
                ctx.restore();
                requestAnimationFrame(rafCallback);
            }
        };
    })();
    requestAnimationFrame(rafCallback);
}
class StyledScribble {
    geometry = new LineSegments();
}
class GamepadCtx {
    canvasRect;
    pathFactory;
    #backing = new Points2DFloatBacked(16);
    gamepadBuffers = new Map();
    newVelocity = this.#backing.extend();
    lastStartVelocity = this.#backing.extend();
    startPoint = this.#backing.extend();
    endpoint = this.#backing.extend();
    centerCanvas = this.#backing.extend();
    #scratch = this.#backing.extend();
    stick1 = this.#backing.extend();
    stick2 = this.#backing.extend();
    rho;
    state = 'Initial';
    lastTimestamp = -1;
    maxVelocityPixelsPerSecond = 500;
    paths = new Map();
    constructor(canvasRect, pathFactory) {
        this.canvasRect = canvasRect;
        this.pathFactory = pathFactory;
        this.rho = Math.min(canvasRect.width, canvasRect.height) / 3;
        this.centerCanvas.setTo(canvasRect.width / 2, canvasRect.height / 2);
        this.startPoint.setTo(this.centerCanvas);
        this.endpoint.setTo(this.startPoint);
    }
    readGamepads(gamepads) {
        let changed = false;
        for (let ix = 0; ix < gamepads.length; ix++) {
            const g = gamepads[ix];
            if (this.gamepadBuffers.has(ix) && !g) {
                this.gamepadBuffers.delete(ix);
            }
            if (!g) {
                continue;
            }
            if (!this.gamepadBuffers.has(ix)) {
                this.gamepadBuffers.set(ix, new HifiBuffer(g.axes.length + g.buttons.length, 16384));
            }
            const buffer = this.gamepadBuffers.get(ix);
            if (buffer.lastTimestamp === g.timestamp) {
                continue;
            }
            this.gamepadBuffers.get(ix).record(g);
            if (ix == 0) {
                changed = true;
            }
        }
        return changed;
    }
    // Only to be called by requestAnimationFrame callbacks.
    gamepadStateUpdate(rafTimestamp, gamepads) {
        const needUpdate = this.readGamepads(gamepads);
        if (!needUpdate) {
            return false;
        }
        const gamepadIx = 0, g = gamepads[gamepadIx], gbuf = this.gamepadBuffers.get(0);
        let buttonDiffs = [];
        if (gbuf.n > 0) {
            buttonDiffs = augmentButtonDiffs(g.id, diffButtonValues(gbuf.pastState(1), g));
        }
        const buttonMap = vendorMaps[g.id];
        function debugHelper_buttonDiffs() {
            if (buttonDiffs.length > 0) {
                const obj = { rafTimestamp, model: g.id, buttonDiffs };
                console.log(JSON.stringify(obj, null, 2));
            }
        }
        debugHelper_buttonDiffs();
        const deltaTMillis = (this.lastTimestamp === -1) ?
            0 : rafTimestamp - this.lastTimestamp;
        this.lastTimestamp = rafTimestamp;
        this.stick1.setTo(axes2UnitCircle(g, 0, 1));
        const stick1Mag = this.stick1.magnitude();
        this.stick1.mulAssign(Math.pow(Math.E, stick1Mag) / Math.E);
        this.stick2.setTo(axes2UnitCircle(g, 2, 3));
        const stick2Mag = this.stick2.magnitude();
        this.stick2.mulAssign(Math.pow(Math.E, stick2Mag) / Math.E);
        document.body.querySelector("h3").innerText = `[${this.state}]`;
        switch (this.state) {
            case 'Initial':
                //  Initial state:
                //    Joystick 2 stretches a line from current position to an endpoint;
                //    Joystick 1 moves current position.
                //    Main button:
                //      draws the line from current position to endpoint,
                //      sets current position to endpoint, and
                //      transitions to drawing state.
                this.updateStartPoint(this.stick1, deltaTMillis);
                this.updateEndpoint(this.stick2, deltaTMillis);
                if (!this.paths.has(gamepadIx)) {
                    this.paths.set(gamepadIx, this.pathFactory({ gamepadIx, gamepad: g }));
                }
                const path = this.paths.get(gamepadIx);
                if (!path.anyLines) {
                    path.moveTo(this.startPoint);
                    path.lineTo(this.endpoint);
                }
                else {
                    path.changeLastLine(this.startPoint, this.endpoint);
                }
                const transitionToDrawing = buttonDiffs.length > 0 && ArrayLike.any(buttonDiffs, (diff) => diff.delta > 0);
                if (transitionToDrawing) {
                    path.lineTo(this.endpoint);
                    this.state = 'Drawing';
                    this.startPoint.setTo(this.endpoint);
                }
                break;
            case 'Drawing':
                //  Drawing state:
                //    Joystick 2 stretches a line from current position to an endpoint;
                //      if close enough to the initial point of the stroke, endpoint snaps to initial point.
                //    Modifier button:
                //      disables snapping to initial point.
                //    Main button:
                //      draws the line from current position to endpoint,
                //      sets current position to endpoint, and
                //      if endpoint is snapped to initial point, completes the active stroke + transitions to initial state.
                //    Secondary button:
                //      completes the active stroke + transitions to initial state.
                this.updateEndpoint(this.#scratch.setTo(this.stick1).addAssign(this.stick2), deltaTMillis);
                const pathD = this.paths.get(gamepadIx);
                if (!pathD) {
                    throw new Error(`In state ${this.state} state without a path.`);
                }
                pathD.changeLast(this.endpoint);
                // TODO: handle un-mapped controllers.
                const buttonPressed = buttonDiffs.length > 0 && ArrayLike.any(buttonDiffs, (diff) => diff.delta > 0);
                const closeSegmentGroups = { 'stick': [] };
                const endSegmentGroups = { 'trigger': [] };
                const drawSegment = ArrayLike.any(buttonDiffs, (diff) => diff.delta > 0 && (!diff.group || !(diff.group in closeSegmentGroups) && !(diff.group in endSegmentGroups)));
                const closeSegment = ArrayLike.any(buttonDiffs, (diff) => diff.delta > 0 && diff.group in closeSegmentGroups);
                const endSegment = ArrayLike.any(buttonDiffs, (diff) => diff.delta > 0 && diff.group in endSegmentGroups);
                if (drawSegment) {
                    pathD.lineTo(this.endpoint);
                    this.startPoint.setTo(this.endpoint);
                    this.updateEndpoint(axes2UnitCircle(g, 0, 1), deltaTMillis);
                }
                if (closeSegment) {
                    pathD.closePath();
                    this.startPoint.setTo(this.endpoint);
                    pathD.moveTo(this.startPoint);
                    pathD.lineTo(this.endpoint);
                    this.state = 'Initial';
                }
                if (endSegment) {
                    this.startPoint.setTo(this.endpoint);
                    pathD.moveTo(this.startPoint);
                    pathD.lineTo(this.endpoint);
                    this.state = 'Initial';
                }
                break;
        }
        return true;
    }
    updateStartPoint(normalizedStickIn, deltaTMillis) {
        deltaTMillis = Math.min(1000, deltaTMillis);
        this.#scratch.setTo(normalizedStickIn).mulAssign(this.maxVelocityPixelsPerSecond);
        // New velocity will exponentially decay from last velocity to the current stick input
        // with a half-life of 125ms.
        alphaBeta(this.lastStartVelocity, this.#scratch, 125, deltaTMillis)(this.newVelocity);
        this.lastStartVelocity.setTo(this.newVelocity);
        this.startPoint.addAssignScaled(this.newVelocity, deltaTMillis / 1000);
        if (!this.inRect(this.startPoint)) {
            this.#scratch.setLinearCombination([[0.9, this.startPoint], [0.1, this.centerCanvas]]);
            this.startPoint.setTo(this.#scratch);
        }
    }
    inRect(p) {
        return p.x >= this.canvasRect.left && p.x <= this.canvasRect.right && p.y >= this.canvasRect.top && p.y <= this.canvasRect.bottom;
    }
    updateEndpoint(normalizedStickIn, deltaTMillis) {
        deltaTMillis = Math.min(1000, deltaTMillis);
        this.endpoint.setTo(normalizedStickIn).mulAssign(this.rho).addAssign(this.startPoint);
    }
}
const ArrayLike = {
    any(arr, pred) {
        for (let ix = 0; ix < arr.length; ix++) {
            if (pred(arr[ix])) {
                return true;
            }
        }
        return false;
    }
};
setup();
