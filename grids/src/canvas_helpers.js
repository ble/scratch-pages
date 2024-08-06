import { Point2DWriter } from "./Point2D.js";
import { fromPx, range } from "./util.js";
export function setupHiDPICanvas(canvas, contextStyle = 'yUp') {
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
        throw new Error("Could not get 2d context.");
    }
    let originalWidth, originalHeight;
    // Get the device pixel ratio, falling back to 1.
    const dpr = window.devicePixelRatio || 1;
    if (dpr != 1) {
        originalWidth = canvas.width;
        originalHeight = canvas.height;
        canvas.width *= dpr;
        canvas.height *= dpr;
        const style = window.getComputedStyle(canvas);
        canvas.style.boxSizing = 'border-box';
        const extraWidth = ['borderLeftWidth', 'borderRightWidth', 'paddingLeft', 'paddingRight'].map(s => fromPx(style[s])).reduce((a, b) => a + b);
        const extraHeight = ['borderTopWidth', 'borderBottomWidth', 'paddingTop', 'paddingBottom'].map(s => fromPx(style[s])).reduce((a, b) => a + b);
        canvas.style.width = `${originalWidth + extraWidth}px`;
        canvas.style.height = `${originalHeight + extraHeight}px`;
    }
    else {
        originalWidth = canvas.width;
        originalHeight = canvas.height;
    }
    let bounds = new DOMRect(0, 0, originalWidth, originalHeight);
    ctx.translate(0.5, 0.5);
    if (contextStyle == 'yUpCenterOrigin') {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(1, -1);
        bounds = new DOMRect(-originalWidth / 2, -originalHeight / 2, originalWidth, originalHeight);
    }
    if (contextStyle == 'yUp') {
        ctx.scale(1, -1);
    }
    ctx.scale(dpr, dpr);
    //ctx.lineWidth *= dpr;
    ctx.save();
    return [ctx, bounds];
}
export function renderLineBandsWithinBounds(bands, bounds, scratchVertices) {
    const [k0, k1] = bands.kRangeForBox(bounds);
    for (let k of range(Math.ceil(k0), Math.floor(k1) + 1)) {
        const [p0, p1] = (bounds.clipLine(bands.kthLine(k)));
        Point2DWriter.write([p0, p1], scratchVertices);
    }
}
export function pathLines(ctx, vertices, [start, end]) {
    for (let ix = start; ix + 1 < end; ix += 2) {
        let p = vertices[ix], q = vertices[ix + 1];
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
    }
}
export function pathLoop(ctx, vertices, [start, end]) {
    let p = vertices[start];
    ctx.moveTo(p.x, p.y);
    for (let ix = start + 1; ix < end; ix++) {
        let q = vertices[ix];
        ctx.lineTo(q.x, q.y);
    }
    ctx.lineTo(p.x, p.y);
}
export function pathCenteredSquare(ctx, center, size) {
    ctx.rect(center.x - size / 2, center.y - size / 2, size, size);
}
export class Brush {
    draw(ctx, vertices) {
        ctx.save();
        this.style(ctx);
        this.drawInner(ctx, vertices);
        ctx.restore();
    }
    style = () => { };
}
/*
interface PathGeometry {
  clear(): void;
  rewindOne(): void;
  beginPath(t?: DOMHighResTimeStamp): void;
  moveTo(x: number, y: number, t?: DOMHighResTimeStamp): void;
  moveTo(p: Point2DReadonly, t?: DOMHighResTimeStamp): void;
  lineTo(x: number, y: number, t?: DOMHighResTimeStamp): void;
  lineTo(p: Point2DReadonly, t?: DOMHighResTimeStamp): void;
  closePath(t?: DOMHighResTimeStamp): void;
}

export interface Drawable {
  draw(ctx: CanvasStyling & CanvasDrawing): void;
}


 argh lol this is not it!
export class Scribble implements PathGeometry, Drawable {
  capacity = 32768 * 16;
  vertices = new Points2DFloatBacked(this.capacity);

  offsetIndex = 0;
  indexIndex = 0;
  startOfPathIndex = -1;
  timestamps = new Float32Array(this.capacity);
  indices = new Uint32Array(this.capacity);

  style: (ctx: CanvasStyling) => void = (ctx) => {
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'black';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  clear(): void {
    this.vertices = new Points2DFloatBacked(this.capacity);
    this.timestamps = new Float32Array(this.capacity);
    this.indices = new Uint32Array(this.capacity);
    this.offsetIndex = 0;
    this.indexIndex = 0;
  }
  rewindOne(): void {
    if(this.indexIndex <= 0) {
      throw new Error("Cannot rewind past beginning.");
    }
    this.indexIndex--;
  }
  beginPath(): void {
    this.startOfPathIndex = this.vertices.offset;
  }

  moveTo(x: number, y: number, t?: DOMHighResTimeStamp): void;
  moveTo(p: Point2DReadonly, t?: DOMHighResTimeStamp): void;
  moveTo(x: number | Point2DReadonly, y?: number | DOMHighResTimeStamp, t?: DOMHighResTimeStamp): void {
    let timestamp: DOMHighResTimeStamp = -1;
    let offsetBefore = this.vertices.offset;
    if(typeof x === 'number' && typeof y === 'number') {
      this.vertices.create(x, y);
      if(t !== undefined) {
        timestamp = t;
      }
    } else if(typeof x === 'object') {
      this.vertices.put(x);
      if(y !== undefined) {
        timestamp = y;
      }
    }
    // Record a break in the path:
    this.indices[this.indexIndex++] = -1;

    // Record start of the new path:
    this.timestamps[offsetBefore] = timestamp;
    this.indices[this.indexIndex++] = offsetBefore;
    this.startOfPathIndex = offsetBefore;
  }

  lineTo(x: number, y: number, t?: DOMHighResTimeStamp): void;
  lineTo(p: Point2DReadonly, t?: DOMHighResTimeStamp): void;
  lineTo(x: number | Point2DReadonly, y?: number | DOMHighResTimeStamp, t?: DOMHighResTimeStamp): void {
    let timestamp: DOMHighResTimeStamp = -1;
    if(t !== undefined) {
      timestamp = t;
    } else if(y !== undefined) {
      timestamp = y;
    }
    let offsetBefore = this.vertices.offset;

    // Record this vertex:
    if(typeof x === 'number' && typeof y === 'number') {
      this.vertices.create(x, y);
    } else if(typeof x === 'object') {
      this.vertices.put(x);
    }
    // Record timestamp of new vertex && a new vertex:
    this.timestamps[offsetBefore] = timestamp;
    this.indices[this.indexIndex++] = offsetBefore;
  }
  closePath(t?: DOMHighResTimeStamp): void {
    this.timestamps[this.vertices.offset] = t ?? -1;
    throw new Error("Method not implemented.");
  }


  draw(ctx: CanvasStyling & CanvasDrawing): void {
    throw new Error("Method not implemented.");
  }
}*/ 
