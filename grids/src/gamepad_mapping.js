const vendorGroups = {
    'HORIPAD S (STANDARD GAMEPAD Vendor: 0f0d Product: 00c1)': {
        'face': [['a', 1], ['b', 0], ['x', 3], ['y', 2]],
        'shoulder': [['l1', 4], ['r1', 5]],
        'trigger': [['l2', 6], ['r2', 7]],
        'pause': [['minus', 8], ['plus', 9]],
        'stick': [['left-stick', 10], ['right-stick', 11]],
        'd-pad': [['d-down', 13], ['d-up', 12], ['d-right', 15], ['d-left', 14]],
        'menu': [['screenshot', 16], ['home', 17]],
    }
};
export function augmentButtonDiffs(padId, diffs) {
    const map = vendorMaps[padId];
    if (map === undefined) {
        return diffs;
    }
    return diffs.map((d) => {
        const mapped = map[d.index];
        if (mapped === undefined) {
            return d;
        }
        return { ...mapped, ...d };
    });
}
function makeButtonMap(groups) {
    const result = [];
    for (let [groupName, buttonIndices] of Object.entries(groups)) {
        if (buttonIndices.length === 0) {
            continue;
        }
        for (let ix = 0; ix < buttonIndices.length; ix++) {
            const b = buttonIndices[ix];
            result[b[1]] = { name: b[0], group: groupName, index: ix, button: b[1] };
        }
    }
    return result;
}
export const vendorMaps = (function () {
    return Object.fromEntries(Object.entries(vendorGroups).map(([vendorProduct, group]) => [vendorProduct, makeButtonMap(group)]));
})();
// buttonMaps = (function(){
//   const result: {[key: string]: Map<number, string>} = {};
//   for(let [vendorProduct, group] of Object.entries(buttonGroups)) {
//     const m = new Map<number, string>();
//     for(let [groupName, buttonIndices] of Object.entries(group)) {
//       for(let ix of buttonIndices) {
//         m.set(ix, groupName);
//       }
//     }
//     result[vendorProduct] = m;
//   }
//   return result;
// })();
