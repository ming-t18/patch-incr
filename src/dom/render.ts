import { encode } from "he";
import type { Patches } from "../incr/patch";
import type { Forward } from "../incr/types";
import type { Dispatch } from "./mount";
import type {
	AttrValue,
	Attrs,
	ChildConstruction,
	DOMConstruction,
	ElementConstruction,
	Events,
} from "./types";

export type RenderFunc<State, Action> = (
	state: State,
	dispatch: Dispatch<Action>,
) => ElementConstruction;

export type RenderForward<State, Action> = (
	dispatch: Dispatch<Action>,
) => Forward<State, ElementConstruction, Action, Patches>;

export const fromAttrValue = (x: AttrValue): string =>
	typeof x === "string" ? x : `${x}`;

export const constructChild = (
	child: ChildConstruction,
	doc = document,
	addEvents = true,
): Element | string | null => {
	if (typeof child === "undefined" || child === false || child === null) {
		return null;
	}
	if (typeof child === "object") {
		return constructDOM(child, doc, addEvents);
	}
	return fromAttrValue(child);
};

export const setEventHandlers = (
	el: Element,
	events: Events | null | undefined,
) => {
	if (!events) {
		return;
	}

	for (const [name, handler] of Object.entries(events)) {
		// @ts-expect-error Avoid type checking for specific events/handlers
		el.addEventListener(name, handler);
	}
};

export const constructDOM = (
	c: DOMConstruction,
	doc = document,
	addEvents = true,
): Element => {
	const el = doc.createElement(c.tag);
	if (c.attrs) {
		for (const [attrName, attr] of Object.entries(c.attrs)) {
			if (attr !== undefined && attr !== null) {
				el.setAttribute(attrName, fromAttrValue(attr));
			}
		}
	}

	if (addEvents && c.events) {
		setEventHandlers(el, c.events);
	}

	if (c.children) {
		for (const child of c.children) {
			const ch = constructChild(child, doc, addEvents);
			if (ch) {
				el.appendChild(typeof ch === "string" ? doc.createTextNode(ch) : ch);
			}
		}
	}
	return el;
};

function* renderAttrsToString(attrs: Attrs | null | undefined) {
	if (!attrs) {
		return;
	}

	for (const [attrName, attr] of Object.entries(attrs)) {
		if (attr !== null && attr !== undefined) {
			yield ` ${attrName}="${encode(fromAttrValue(attr))}"`;
		}
	}
}

export function* renderToStringGen(
	c: DOMConstruction,
): Generator<string, void, undefined> {
	const { tag, attrs, children } = c;
	yield `<${tag}`;
	yield* renderAttrsToString(attrs);
	if (!children) {
		yield "/>";
		return;
	}

	yield ">";

	let lastText = false;
	for (const child of children) {
		if (child === null || child === undefined || typeof child !== "object") {
			if (lastText) {
				yield "<!-- -->";
			}
			lastText = true;
			if (child) {
				yield encode(fromAttrValue(child));
			}
		} else {
			yield* renderToStringGen(child);
			lastText = false;
		}
	}

	yield `</${tag}>`;
	return;
}

export const renderToString = (c: DOMConstruction) =>
	[...renderToStringGen(c)].join("");

export const hydrate = (el: Element, c: DOMConstruction) => {
	setEventHandlers(el, c.events);
	const { children } = c;
	if (!children) {
		return;
	}

	if (el.tagName !== c.tag.toUpperCase()) {
		console.warn("hydrate: mismatch: tag name", el, c);
	}

	let elem = el.firstElementChild;
	if (!elem) {
		return;
	}

	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (!elem) {
			if (child) {
				console.warn("hydrate: mismatch: children", elem, child);
			}
			break;
		}

		if (child && typeof child === "object") {
			hydrate(elem, child);
			elem = elem?.nextElementSibling;
		}
	}
};
