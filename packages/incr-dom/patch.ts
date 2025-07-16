import {
	applyPatches,
	type PatchEntry,
	type Patches,
	PatchOp,
} from "incr/data/patch";
import { IndexEnd } from "incr/patchSchema/types";
import { clearAttrs, setAttributeFromConstruction, setAttrs } from "./attr";
import {
	addOrReplaceEventHandler,
	clearEventHandlers,
	getEventManager,
	removeEventHandler,
	setEventHandlers,
} from "./events/eventManager";
import { addChildrenFromConstruction, constructDOM, hydrate } from "./render";
import { type ElementConstruction, isElementConstruction } from "./types";

const skipComments = (el: ChildNode | null): ChildNode | null => {
	let node: ChildNode | null = el;
	while (node !== null) {
		if (
			node.nodeType === Node.TEXT_NODE ||
			node.nodeType === Node.ELEMENT_NODE
		) {
			break;
		}
		node = node.nextSibling;
	}
	return node;
};

const getNthChild = (el: Element, index: number): ChildNode | null => {
	let node = skipComments(el.firstChild);
	let i = index;
	while (i !== 0) {
		if (node === null) {
			break;
		}
		node = skipComments(node.nextSibling);
		i--;
	}
	return node as Element | Text | null;
};

export const analyzePatchElement = (
	el: Element,
	domc: ElementConstruction,
	entry: PatchEntry<ElementConstruction>,
): {
	el: Element | Text | null;
	domc: ElementConstruction;
	entry: PatchEntry<ElementConstruction>;
} => {
	const { path } = entry;

	if (
		path.length > 2 &&
		path[0] === "children" &&
		typeof path[1] === "number"
	) {
		if (!domc.children) {
			throw new TypeError("Expecting children for domc, but has no children.");
		}

		const index = path[1];
		if (index < 0 || index >= domc.children.length) {
			throw new TypeError(
				"Expecting a specific child, but index is out of range.",
			);
		}

		if (el.nodeType === Node.TEXT_NODE) {
			// console.error("analyzePatchElement: ", { el, entry });
			throw new TypeError("Attempting to patch the children of a Text node.");
		}

		const child = getNthChild(el as Element, index);
		if (child === null) {
			// console.error("analyzePatchElement indexing failure", {
			// 	index,
			// 	el,
			// 	child,
			// 	entry,
			// });
			throw new TypeError("Expecting an Element but got a Text instead.");
		}

		const domcChild = domc.children[index];
		if (!isElementConstruction(domcChild)) {
			throw new TypeError("mismatch: cannot patch inside a text.");
		}
		return analyzePatchElement(child as Element, domcChild, {
			...entry,
			path: path.slice(2),
		});
	}

	return { el, domc, entry };
};

export const onNodeTeardown = (node: Element | Text | null | undefined) => {
	if (!(node && node.nodeType === Node.ELEMENT_NODE)) {
		return;
	}

	let eventManager = getEventManager(node as Element);
	eventManager.teardown();
	// @ts-expect-error
	eventManager = null;
	let child: ChildNode | null = node.firstChild;
	while (child !== null) {
		if (child.nodeType === Node.ELEMENT_NODE) {
			onNodeTeardown(child as Element);
		}
		child = child.nextSibling;
	}
};

export const SSR_ATTR = "data-ssr";

export const renderDOM = (
	root: Element,
	domc: ElementConstruction,
	addEvents = true,
	doc = document,
) => {
	if (!root.hasAttribute(SSR_ATTR)) {
		root.innerHTML = "";
		root.appendChild(constructDOM(domc, doc, addEvents));
	} else {
		console.info("renderDOM: already server-side rendered");
	}
	const node = root.firstElementChild;
	if (!node) {
		// console.warn("renderDOM: is empty");
		return;
	}

	if (addEvents) {
		hydrate(node, domc);
	}
};

function ensureElement(
	el: Element | Text | null | undefined,
): asserts el is Element {
	if (!(el && el.nodeType === Node.ELEMENT_NODE)) {
		throw new Error("Expecting an Element.");
	}
}

export const patchDOMEntry = (res: {
	el: Element | Text | null;
	domc: ElementConstruction;
	entry: PatchEntry<ElementConstruction>;
	doc?: Document | null;
}) => {
	const { el, entry, doc: _doc0 } = res;
	const { op, path } = entry;

	if (path.length === 1) {
		ensureElement(el);
		const field = entry.path[0] as keyof ElementConstruction;
		if (op === PatchOp.Remove || op === PatchOp.Replace) {
			if (field === "children") {
				el.innerHTML = "";
			} else if (field === "events") {
				clearEventHandlers(el);
			} else if (field === "attrs") {
				clearAttrs(el);
			} else if (field === "tag") {
				if (op === PatchOp.Remove) {
					throw new Error("patchDOMEntry: tag: cannot delete tag name");
				}
				// tagName can't be changed in a fine-grained way
				return false;
			} else {
				return false;
			}
		}

		if (op === PatchOp.Add || op === PatchOp.Replace) {
			el.innerHTML = "";
			if (field === "children") {
				addChildrenFromConstruction(el, entry.value, document, true);
			} else if (field === "events") {
				setEventHandlers(el, entry.value);
			} else if (field === "attrs") {
				setAttrs(el, entry.value);
			} else if (field === "tag") {
				// tagName can't be changed in a fine-grained way
				return false;
			} else {
				throw new Error(`patchDOMEntry: invalid field: ${field}`);
			}
		}
	} else if (path.length === 2) {
		ensureElement(el);
		const field = entry.path[0] as keyof ElementConstruction;
		if (field === "attrs") {
			const attr = entry.path[1] as string;
			if (op === PatchOp.Remove) {
				el.removeAttribute(attr);
			} else if (op === PatchOp.Add || op === PatchOp.Replace) {
				setAttributeFromConstruction(el, attr, entry.value);
			}
		} else if (field === "events") {
			const attr = entry.path[1] as string;
			if (op === PatchOp.Remove) {
				removeEventHandler(el, attr);
			} else if (op === PatchOp.Add || op === PatchOp.Replace) {
				addOrReplaceEventHandler(el, attr, entry.value);
			}
		} else if (field === "children") {
			const index = entry.path[1] as number | IndexEnd;
			if (op === PatchOp.Add) {
				const newNode = constructDOM(entry.value, document, true);
				if (index === IndexEnd) {
					el.appendChild(newNode);
				} else {
					const ref = getNthChild(el, index);
					if (ref === null) {
						el.appendChild(newNode);
					}
				}
			} else {
				if (index === IndexEnd) {
					throw new TypeError("patchDOMEntry: child: index must be a number");
				}

				const ref = getNthChild(el, index);
				if (ref === null) {
					throw new Error("patchDOMEntry: child: index out of a range");
				}

				if (op === PatchOp.Remove) {
					onNodeTeardown(ref as Element | Text);
					ref.remove();
				} else if (op === PatchOp.Replace) {
					const newNode = constructDOM(entry.value, document, true);
					onNodeTeardown(ref as Element | Text);
					ref.replaceWith(newNode);
				}
			}
		} else {
			throw new Error(`patchDOMEntry: invalid field: ${field}`);
		}
	} else {
		throw new Error(`patchDOMEntry: path is too long`);
	}

	return true;
};

export const patchDOM = (
	root: Element,
	domc0: ElementConstruction,
	domcChanges: Patches<ElementConstruction>,
) => {
	const node = root.firstElementChild;
	if (!node) {
		console.warn("patchDOM: root has no children");
		return;
	}

	let domc = domc0;
	for (const entry of domcChanges) {
		const res = analyzePatchElement(root.firstElementChild, domc, entry);
		if (patchDOMEntry(res)) {
			domc = applyPatches(domc, [entry]);
			continue;
		}

		const targetNode = res.el;
		const domcBefore = res.domc;
		const domcUpdated = applyPatches(domcBefore, [res.entry]);
		onNodeTeardown(targetNode);
		const replacement = constructDOM(domcUpdated, document, true);
		targetNode?.replaceWith(replacement);
		console.warn("patchDOM: unhandled patch entry, need to replace entire", {
			// parent: res.el,
			// replacement,
			entry: res.entry,
			domcBefore,
			domcUpdated,
		});
	}
};
