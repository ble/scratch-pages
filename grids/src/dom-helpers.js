export function getContentBoxOffsets(element) {
    const style = window.getComputedStyle(element);
    function extractPx(value) {
        return value.endsWith('px') ? parseFloat(value.substring(0, value.length - 2)) : 0;
    }
    const borderLeft = extractPx(style.borderLeftWidth), borderTop = extractPx(style.borderTopWidth), borderRight = extractPx(style.borderRightWidth), borderBottom = extractPx(style.borderBottomWidth), paddingLeft = extractPx(style.paddingLeft), paddingTop = extractPx(style.paddingTop), paddingRight = extractPx(style.paddingRight), paddingBottom = extractPx(style.paddingBottom);
    return {
        'left': borderLeft + paddingLeft,
        'top': borderTop + paddingTop,
        'right': borderRight + paddingRight,
        'bottom': borderBottom + paddingBottom
    };
}
export function memoizedOnElement(element, key, fn) {
    const untyped = element;
    if (key in untyped) {
        return untyped[key];
    }
    const value = fn(element);
    untyped[key] = value;
    return value;
}
export function getContentCoordinates(element, { offsetX, offsetY }) {
    const rect = element.getBoundingClientRect();
    const boxOffsets = memoizedOnElement(element, 'contentBoxOffsets', getContentBoxOffsets);
    const contentWidth = rect.width - boxOffsets.left - boxOffsets.right, contentHeight = rect.height - boxOffsets.top - boxOffsets.bottom;
    offsetX = offsetX - boxOffsets.left;
    offsetY = offsetY - boxOffsets.top;
    if (0 <= offsetX && offsetX < contentWidth && 0 <= offsetY && offsetY < contentHeight) {
        return [new DOMPoint(offsetX, offsetY), new DOMRect(0, 0, contentWidth, contentHeight)];
    }
    return null;
}
export function getContentFractionalCoordinates(contentPoint, contentRect, upIsPlusY = true) {
    const fracX = (contentPoint.x - contentRect.x) / contentRect.width;
    let fracY = (contentPoint.y - contentRect.y) / contentRect.height;
    if (upIsPlusY) {
        fracY = 1 - fracY;
    }
    return { fracX, fracY };
}
export function mouseEventToLogicalCoordinates(element, event, logicalRect, upIsPlusY = true) {
    const result = getContentCoordinates(element, overrideOffsetXY(event));
    if (result === null) {
        return null;
    }
    const [contentPoint, contentRect] = result;
    const { fracX, fracY } = getContentFractionalCoordinates(contentPoint, contentRect, upIsPlusY);
    return new DOMPoint(logicalRect.x + fracX * logicalRect.width, logicalRect.y + fracY * logicalRect.height);
}
function overrideOffsetXY(event) {
    const target = event.target, rect = target.getBoundingClientRect(), offsetX = event.clientX - rect.left, offsetY = event.clientY - rect.top;
    return { offsetX, offsetY };
}
export function outputForElement(e) {
    return document.querySelector(`output[for="${e.id}"]`);
}
