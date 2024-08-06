function setup() {
    const toolbar = document.querySelector('.toolbar');
    const parent = toolbar.parentElement;
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    let grabbedPoint = null;
    let childOffset = null;
    toolbar.addEventListener('pointerdown', (e) => {
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
}
setup();
export {};
