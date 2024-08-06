const canvases = document.querySelector("layered-canvases");
const bg = canvases.getCanvas("background");
const fg1 = canvases.addCanvas("foreground1");
const fg2 = canvases.addCanvas("foreground2");
function drawBackground(canvas) {
    const { width, height } = canvas;
    const ctx = canvas.getContext("2d");
    const checkSize = 40;
    for (let i = 0; i < width + checkSize; i += checkSize) {
        for (let j = 0; j < height + checkSize; j += checkSize) {
            const parity = (((i + j) / checkSize) % 2);
            if (parity == 1) {
                continue;
            }
            ctx.fillRect(i, j, checkSize, checkSize);
        }
    }
}
bg.getContext("2d").fillStyle = "rgba(0, 0, 0, 0.5)";
drawBackground(bg);
const fg1Ctx = fg1.getContext("2d");
fg1Ctx.fillStyle = "rgb(255, 0, 0)";
fg1Ctx.font = "96px serif";
const metrics = fg1Ctx.measureText("hello");
const fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
// this is sort of crap
fg1Ctx.fillText("hello", (fg1.width - metrics.width) / 2, fg1.height / 2);
const fg2Ctx = fg2.getContext("2d");
fg2Ctx.fillStyle = "rgba(0, 128, 192, 0.9)";
fg2Ctx.fillRect(170, 90, 150, 150);
function swap(a, ix, jx) {
    const t = a[ix];
    a[ix] = a[jx];
    a[jx] = t;
}
function rotate(a) {
    const item = a.shift();
    a.push(item);
}
const layerOrder = ["foreground2", "foreground1", "background"];
window.setInterval(() => {
    //swap(layerOrder, 0, 1);
    rotate(layerOrder);
    canvases.bringToFront(...layerOrder);
}, 500);
export {};
