import type { PatchEntry, Path } from "../incr/patch";

export const tryAccessElement = (root: Element, patch: PatchEntry) => {
    let el = root;
    const { path } = patch;
    // path: [('children', index)*, 'key']
    for (let i = 0; i < patch.path.length; i += 2) {
        if (patch[i] !== 'children') {
            throw new Error("Invalid key: ", )
        }
    }
}

export const applyDOMPatchItem = (root: Element, patch: PatchEntry) => {
    const found = tryAccessElement(root, patch);
    if (!found) {
        throw new Error("Invalid path");
    }

    const { key, op, value } = root;
};

