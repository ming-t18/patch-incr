import { getEventManager } from "./events/eventManager";
import type {
	Attrs,
	ChildConstruction,
	DOMConstruction,
	Events,
	TextConstruction,
} from "./types";

export const textToDOMC = (el: Text): TextConstruction => el.textContent;

export const toDOMC = (el: Element, events = true): DOMConstruction => {
	const attrs: Attrs = {};
	for (let i = 0; i < el.attributes.length; i++) {
		const attr = el.attributes.item(i);
		if (!attr) {
			break;
		}

		attrs[attr.name] = attr.value;
	}
	const children: ChildConstruction[] = [];
	el.childNodes.forEach((child) => {
		if (child.nodeType === Node.TEXT_NODE) {
			children.push(textToDOMC(child as Text));
		} else if (child.nodeType === Node.ELEMENT_NODE) {
			children.push(toDOMC(child as Element, events));
		}
	});

	if (events) {
		const m = getEventManager(el);
		const events: Events = {};
		for (const [name, handler] of m.entries()) {
			events[name] = handler;
		}

		return {
			tag: el.tagName,
			attrs,
			events,
			children,
		};
	}

	return {
		tag: el.tagName,
		attrs,
		children,
	};
};
