import { fromAttrValue } from "./render";
import type {
	Attrs,
	AttrValue,
	ChildConstruction,
	ElementConstruction,
	Events,
} from "./types";

export const elem = (
	tag: string,
	attrs?: Attrs,
	children?: ChildConstruction[] | null,
): ElementConstruction => ({ tag, attrs, children });

export const elemEvents = (
	tag: string,
	attrs?: Attrs,
	events?: Events,
	children?: ChildConstruction[] | null,
): ElementConstruction => ({ tag, attrs, events, children });

export const elem0Events = (
	tag: string,
	events?: Events,
	children?: ChildConstruction[] | null,
): ElementConstruction => ({ tag, events, children });

export const elem0 = (
	tag: string,
	children?: ChildConstruction[] | null,
): ElementConstruction => ({
	tag,
	children,
});

export type Props = Record<string, unknown>;
export type Child = HTMLElement | AttrValue;
export type Tag<E extends Element = Element> = (
	props: Props,
	...children: Child[]
) => E;
export type Tags = Readonly<Record<string, Tag>>;

export const makeTags = (
	build: (tag: string, props: Props, children: Child[]) => Element,
) =>
	new Proxy({} as Record<string, Tag>, {
		isExtensible() {
			return false;
		},
		get(target, tag, _receiver) {
			if (typeof tag === "symbol" || tag === "") {
				throw new Error("Invalid tag.");
			}
			if (target[tag]) {
				return target[tag];
			}
			const func: Tag = (props, ...children) => build(tag, props, children);
			return func;
		},
	}) as never as Tags;

export const tryGetEventName = (key: string): string | null => {
	if (key.startsWith("on")) {
		return key.substring(2);
	}
	return null;
};

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

export const setProps = (el: Element, props: Props) => {
	for (const [key, value] of Object.entries(props)) {
		const event = tryGetEventName(key);
		if (event !== null) {
			el.addEventListener(event, value as never);
			continue;
		}

		if (
			typeof value === "function" ||
			typeof value === "object" ||
			typeof value === "symbol"
		) {
			throw new Error(
				`Cannot set attribute, key=${key}, typeof value=${typeof value}`,
			);
		}

		if (value !== undefined && value !== null) {
			setAttributeFromConstruction(el, key, value as AttrValue);
		}
	}
};

export const childToNode = (doc: Document, child: Child): Node | null => {
	if (child instanceof Node) {
		return child;
	}

	if (child === null || child === undefined) {
		return doc.createTextNode(`${child}`);
	}

	return doc.createTextNode(`${child}`);
};

export const setChildren = (el: HTMLElement, children: Child[]) => {
	for (const child of children) {
		const n = childToNode(el.ownerDocument, child);
		n && el.appendChild(n);
	}
};

export const html: Readonly<{
	[key in keyof HTMLElementTagNameMap]: Tag<HTMLElementTagNameMap[key]>;
}> = makeTags((tag, props, children) => {
	const el = document.createElement(tag);
	setProps(el, props);
	setChildren(el, children);
	return el;
}) as never;
