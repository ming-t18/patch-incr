import { type PatchEntry, PatchOp, type Path } from "../incr/patch";
import { constructDOM, fromAttrValue } from "./render";

export const tryAccessElement = (
	root: Element,
	patch: PatchEntry,
): [Node, PatchEntry] | null => {
	let el: Node = root;
	const { path } = patch;
	// DOMConstructionPath: ('children'? index)* 'tag' | 'attrs' | 'events' | 'children'
	let i = 0;
	while (true) {
		const e1 = path[i];
		let skip = 2;
		let parsedIndex = -1;

		if (typeof e1 === "number") {
			parsedIndex = e1;
			skip = 1;
		} else {
			if (e1 !== "children") {
				break;
			}

			if (i + 1 >= path.length) {
				break;
			}

			const e2 = path[i + 1];
			if (typeof e2 !== "number") {
				break;
			}

			parsedIndex = e2;
		}

		if (!(el instanceof Element)) {
			break;
		}
		el = el.childNodes.item(parsedIndex);
		i += skip;
	}
	return [el, { ...patch, path: path.slice(i) }];
};

export const applyDOMPatchItem = (root: Element, patch: PatchEntry) => {
	const found = tryAccessElement(root, patch);
	if (!found) {
		throw new Error("Invalid path");
	}

	const [root1, patch1] = found;
	const path = patch1.path;
	const el = root1 as Element;
	if (path.length === 0) {
		if (patch1.op === PatchOp.Add) {
			return true;
		}

		const parent = root1.parentNode;
		if (!parent) {
			throw new Error("parent not found");
		}
		if (patch1.op === PatchOp.Remove) {
			parent.removeChild(root1);
			return false;
		}
		if (patch1.op === PatchOp.Replace) {
			const replaced = constructDOM(patch1.value, root.ownerDocument);
			parent.replaceChild(replaced, root1);
			return false;
		}
		// @ts-expect-error patch1 is never
		throw new Error(`unsupported op: ${patch1.op}`);
	}

	if (path.length === 1) {
		if (path[0] === "tag") {
			// cannot rename tag
			return true;
		}

		return true;
	}

	if (path[0] === "tag") {
		throw new Error(`invalid path: ${JSON.stringify(path, null, 0)}`);
	}

	if (path.length === 2) {
		if (patch1.path[0] === "children") {
			const index = patch1.path[1];
			if (typeof index !== "number") {
				throw new Error(`invalid path: ${JSON.stringify(path, null, 0)}`);
			}

			if (patch1.op === PatchOp.Remove) {
				el.removeChild(el.childNodes.item(index));
				return false;
			}

			if (patch1.op === PatchOp.Replace) {
				const replaced = constructDOM(patch1.value, root.ownerDocument);
				el.replaceChild(replaced, el.childNodes.item(index));
				return false;
			}

			if (patch1.op === PatchOp.Add) {
				const replaced = constructDOM(patch1.value, root.ownerDocument);
				if (index >= el.childNodes.length) {
					el.appendChild(replaced);
				} else {
					el.insertBefore(replaced, el.childNodes.item(index));
				}
				return false;
			}

			// @ts-expect-error patch1 is never
			throw new Error(`unsupported op: ${patch1.op}`);
		}

		const key = patch1.path[1];
		if (typeof key !== "string") {
			throw new Error(`invalid path: ${JSON.stringify(path, null, 0)}`);
		}

		if (patch1.path[0] === "attrs") {
			if (patch1.op === PatchOp.Add || patch1.op === PatchOp.Replace) {
				el.setAttribute(key, fromAttrValue(patch1.value));
				return false;
			}

			if (patch1.op === PatchOp.Remove) {
				el.removeAttribute(key);
				return false;
			}

			// @ts-expect-error patch1 is never
			throw new Error(`unsupported op: ${patch1.op}`);
		}

		if (patch1.path[0] === "events") {
			if (typeof key !== "string") {
				throw new Error(`invalid path: ${JSON.stringify(path, null, 0)}`);
			}

			if (patch1.op === PatchOp.Replace) {
				// can't replace event
				return true;
			}

			if (patch1.op === PatchOp.Add) {
				el.addEventListener(key, patch1.value);
				return false;
			}

			if (patch1.op === PatchOp.Remove) {
				// can't remove event
				return true;
			}

			// @ts-expect-error patch1 is never
			throw new Error(`unsupported op: ${patch1.op}`);
		}

		throw new Error("invalid patch");
	}

	throw new Error(`invalid path: ${JSON.stringify(path, null, 0)}`);
};
