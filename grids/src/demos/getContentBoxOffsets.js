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
