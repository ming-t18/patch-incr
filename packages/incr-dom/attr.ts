import type { Attrs, AttrValue } from "./types";

export const setAttributeFromConstruction = (
	el: Element,
	attr: string,
	value: AttrValue,
) => {
	if (value === null || value === false || typeof value === "undefined") {
		el.removeAttribute(attr);
	} else {
		el.setAttribute(attr, fromAttrValue(value));
	}
};

export const fromAttrValue = (x: AttrValue): string =>
	x === null || typeof x === "undefined"
		? ""
		: typeof x === "string"
			? x
			: `${x}`;

export const clearAttrs = (el: Element) => {
	for (let i = el.attributes.length - 1; i >= 0; i--) {
		const node = el.attributes.item(i);
		if (node === null) {
			break;
		}
		el.removeAttributeNode(node);
	}
};

export const setAttrs = (el: Element, attrs: Attrs) => {
	for (const [key, value] of Object.entries(attrs)) {
		if (typeof value !== "undefined" && value !== null) {
			setAttributeFromConstruction(el, key, value);
		}
	}
};
