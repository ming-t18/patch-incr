import { escape as escapeHTML } from "lodash-es";
import type { IF } from "../incr/types";
import { fromAttrValue, setAttributeFromConstruction } from "./attr";
import { setEventHandlers } from "./events/eventManager";
import type { Dispatch } from "./mount";
import {
	type Attrs,
	type ChildConstruction,
	type DOMConstruction,
	type ElementConstruction,
	isElementConstruction,
} from "./types";

export interface StateDispatch<State, Action> {
	state: State;
	dispatch: Dispatch<Action>;
}

export type RenderFunc<State, Action> = ({
	state,
	dispatch,
}: StateDispatch<State, Action>) => ElementConstruction;

export type RenderIF<State, Action> = IF<
	StateDispatch<State, Action>,
	ElementConstruction
>;

export const constructChild = (
	child: ChildConstruction,
	doc = document,
	addEvents = true,
): Element | Text | null => {
	if (typeof child === "undefined" || child === false || child === null) {
		return null;
	}
	if (typeof child === "object") {
		return constructDOM(child, doc, addEvents);
	}
	return doc.createTextNode(String(child));
};

export const addChildrenFromConstruction = (
	el: Element,
	children: ChildConstruction[],
	doc = document,
	addEvents = true,
) => {
	for (const child of children) {
		const ch = constructChild(child, doc, addEvents);
		if (ch) {
			el.appendChild(typeof ch === "string" ? doc.createTextNode(ch) : ch);
		}
	}
};

export const constructDOM = (
	c: DOMConstruction,
	doc = document,
	addEvents = true,
): Element | Text => {
	if (!isElementConstruction(c)) {
		return doc.createTextNode(String(c));
	}

	const el = doc.createElement(c.tag);
	if (c.attrs) {
		for (const [attrName, attr] of Object.entries(c.attrs)) {
			if (attr !== undefined && attr !== null) {
				setAttributeFromConstruction(el, attrName, fromAttrValue(attr));
			}
		}
	}

	if (addEvents && c.events) {
		setEventHandlers(el, c.events);
	}

	if (c.children) {
		const children = c.children;
		addChildrenFromConstruction(el, children, doc, addEvents);
	}
	return el;
};

function* renderAttrsToString(attrs: Attrs | null | undefined) {
	if (!attrs) {
		return;
	}

	for (const [attr, value] of Object.entries(attrs)) {
		if (!(value === null || typeof value === "undefined" || value === false)) {
			yield ` ${attr}="${escapeHTML(fromAttrValue(value))}"`;
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
			if (child !== null && child !== undefined) {
				yield child === "" ? "" : escapeHTML(String(child));
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

export const hydrate = (el: Element, domc: DOMConstruction) => {
	setEventHandlers(el, domc.events);
	const { children } = domc;
	if (!children) {
		return;
	}

	if (el.tagName !== domc.tag.toUpperCase()) {
		console.warn("hydrate: mismatch: tag name", el, domc);
	}

	let childElem = el.firstElementChild;
	if (!childElem) {
		return;
	}

	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (!isElementConstruction(child)) {
			continue;
		}
		if (!childElem) {
			console.warn(
				"hydrate: mismatch: children: actual children list has fewer children than domc",
				{
					newConstruction: domc,
					domcIndex: i,
				},
			);
			break;
		}

		hydrate(childElem, child);
		childElem = childElem?.nextElementSibling;
	}

	if (childElem?.nextElementSibling) {
		console.warn(
			"hydrate: mismatch: children: actual children list has surplus children compared to domc",
			{ elem: childElem },
		);
	}
};
