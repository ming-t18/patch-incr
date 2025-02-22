import { constructDOM } from "./render";
import type { ElementConstruction } from "./types";

const ElementKey = Symbol("Element");
const EventsKey = Symbol("Events");

type ElementWrapper = { [ElementKey]: Element };

type EventsWrapper = {
	[ElementKey]: Element;
	// biome-ignore lint/complexity/noBannedTypes: doesn't care about specific function here
	[EventsKey]?: Record<string, Function>;
};

function ensureAttrName(prop: unknown): asserts prop is string {
	if (typeof prop !== "string") {
		throw new RangeError("invalid attribute name");
	}
	if (prop.length === 0) {
		throw new RangeError("invalid attribute name");
	}
	return;
}

function ensureEventName(prop: unknown): asserts prop is string {
	if (!(typeof prop === "string" && prop.length > 0)) {
		throw new RangeError("invalid event name");
	}
	return;
}

// biome-ignore lint/complexity/noBannedTypes: function
function ensureFunction(value: unknown): asserts value is Function {
	if (typeof value !== "function") {
		throw new RangeError("must be function");
	}
	return;
}

function hasEvent(target: EventsWrapper, eventName: string) {
	return !!target[EventsKey]?.[eventName];
}

// biome-ignore lint/complexity/noBannedTypes: function
function setEvent(target: EventsWrapper, eventName: string, event: Function) {
	if (!target[EventsKey]) {
		target[EventsKey] = {};
	}
	target[EventsKey][eventName] = event;
}

const attrsHandler: ProxyHandler<ElementWrapper> = {
	isExtensible() {
		return false;
	},
	get(target, prop: string | symbol) {
		ensureAttrName(prop);
		return target[ElementKey].getAttribute(prop);
	},
	set(target, prop, newValue: unknown): boolean {
		ensureAttrName(prop);
		if (typeof newValue === "undefined" || newValue === null) {
			target[ElementKey].removeAttribute(prop);
			return true;
		}
		if (typeof newValue !== "string") {
			throw new RangeError("must be string | null | undefined");
		}
		target[ElementKey].setAttribute(prop, newValue);
		return true;
	},
	has(target, prop) {
		if (typeof prop !== "string") {
			return false;
		}
		return target[ElementKey].hasAttribute(prop);
	},
	deleteProperty(target, prop): boolean {
		ensureAttrName(prop);
		if (!target[ElementKey].hasAttribute(prop)) {
			return false;
		}

		target[ElementKey].removeAttribute(prop);
		return true;
	},
};

const eventsHandler: ProxyHandler<EventsWrapper> = {
	isExtensible() {
		return false;
	},
	get(target, prop: string | symbol) {
		ensureEventName(prop);
		return target[EventsKey]?.[prop];
	},
	set(target, prop, handler: unknown): boolean {
		ensureEventName(prop);
		ensureFunction(handler);
		if (hasEvent(target, prop)) {
			target[ElementKey].removeEventListener(prop, handler as never);
		}
		if (!prop) {
			// remove event
			return true;
		}

		setEvent(target, prop, handler);
		target[ElementKey].addEventListener(prop, handler as never);
		return true;
	},
	has(target, prop) {
		if (typeof prop !== "string") {
			return false;
		}
		return hasEvent(target, prop);
	},
	deleteProperty(target, prop): boolean {
		ensureEventName(prop);
		if (hasEvent(target, prop)) {
			target[ElementKey].removeEventListener(
				prop,
				target[EventsKey]?.[prop] as never,
			);
			return true;
		}

		return false;
	},
};

const isTextOrElement = (node: Node): node is Text | Element => {
	return (
		node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE
	);
};

const tryParseIndex = (prop: string | symbol): number | null => {
	if (typeof prop === "symbol") {
		throw new Error("invalid index");
	}

	const i = Number.parseInt(prop, 10);
	if (!Number.isFinite(i) || i < 0) {
		return null;
	}
	return i;
};

const mapNodeToProxy = (node: Node) => {
	return node.nodeType === Node.TEXT_NODE
		? node.textContent
		: node.nodeType === Node.ELEMENT_NODE
			? makeElementProxy(node as Element)
			: null;
};

const mapValueToNode = (value: unknown, document: Document): Element | Text => {
	if (value === null || value === undefined) {
		return document.createTextNode("");
	}

	if (typeof value === "string") {
		return document.createTextNode(value);
	}

	if (value instanceof Text || value instanceof Element) {
		return value;
	}

	if (
		typeof value === "object" &&
		"tag" in value &&
		typeof value.tag === "string"
	) {
		return constructDOM(value as never, document, true);
	}

	return document.createTextNode(String(value));
};

const childrenHandler: ProxyHandler<ElementWrapper> = {
	isExtensible() {
		return false;
	},
	get(target, prop: string | symbol) {
		const el = target[ElementKey];
		const len = el.childNodes.length;
		if (prop === "length") {
			return el.childNodes.length;
		}
		if (typeof prop === "string" && prop in Array.prototype) {
			throw new Error(`unsupported array method: ${prop}`);
		}

		const idx = tryParseIndex(prop);
		if (idx === null) {
			return undefined;
		}
		if (idx >= len) {
			return undefined;
		}

		const node = el.childNodes.item(idx);
		if (!isTextOrElement(node)) {
			return null;
		}
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent;
		}
		return mapNodeToProxy(node);
	},
	set(target, prop: string | symbol, value: unknown) {
		if (prop === "length") {
			throw new RangeError("cannot change length");
		}
		const idx = tryParseIndex(prop);
		const el = target[ElementKey];
		if (idx === null) {
			return false;
		}
		if (idx >= el.childNodes.length) {
			const el = target[ElementKey];
			const targetLen = idx + 1;
			while (el.childNodes.length < targetLen) {
				el.appendChild(el.ownerDocument.createTextNode(""));
			}
		}
		el.childNodes[idx] = mapValueToNode(value, el.ownerDocument);
		return true;
	},
};

const elementHandler: ProxyHandler<Element> = {
	isExtensible() {
		return false;
	},
	get(target, prop: string | symbol) {
		if (prop === "tag") {
			return target.tagName.toLowerCase();
		}
		if (prop === "children") {
			return makeChildrenProxy(target);
		}
		if (prop === "attrs") {
			return makeAttrsProxy(target);
		}
		if (prop === "events") {
			return makeEventsProxy(target);
		}
		return undefined;
	},
};

export const makeAttrsProxy = (elem: Element) =>
	new Proxy({ [ElementKey]: elem }, attrsHandler);

export const makeEventsProxy = (elem: Element) =>
	new Proxy({ [ElementKey]: elem, [EventsKey]: {} }, eventsHandler);

export const makeChildrenProxy = (elem: Element) =>
	new Proxy({ [ElementKey]: elem }, childrenHandler);

export const makeElementProxy = (elem: Element) =>
	new Proxy(elem, elementHandler) as never as ElementConstruction;
