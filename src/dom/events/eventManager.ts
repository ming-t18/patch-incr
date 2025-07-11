import type { Events } from "../types";

export type EventName = keyof ElementEventMap;
export type EventHandler<
	K extends EventName = EventName,
	E extends Element = Element,
> = (this: E, event: ElementEventMap[K]) => void;

export class EventManager<E extends Element = Element> {
	readonly #map = new Map<string, EventHandler<EventName, E>>();

	public constructor(private readonly el: E) {}

	public setEvent<K extends keyof ElementEventMap>(
		type: K,
		handler: EventHandler<K, E>,
	) {
		this.deleteEvent(type);
		this.el.addEventListener(type, handler);
		this.#map.set(type, handler as never);
	}

	public deleteEvent<K extends keyof ElementEventMap>(type: K): boolean {
		const existing = this.#map.get(type);
		if (existing) {
			this.el.removeEventListener(type, existing);
			this.#map.delete(type);
			return true;
		}
		return false;
	}

	public clear() {
		for (const key of this.#map.keys()) {
			this.deleteEvent(key as never);
		}
	}

	public teardown() {
		this.clear();
		this.#map.clear();
		// @ts-expect-error Clears reference to element
		this.el = null;
	}

	// @ts-ignore MapIterator is not defined
	public entries(): MapIterator<[string, EventHandler<EventName, E>]> {
		return this.#map.entries();
	}
}

const EventManagerKey = Symbol.for("incr/dom/EventManagerKey");
export const getEventManager = (node: Element): EventManager => {
	if (
		EventManagerKey in node &&
		node[EventManagerKey] instanceof EventManager
	) {
		return node[EventManagerKey];
	}

	const eventManager = new EventManager(node);
	// @ts-expect-error Adding new property
	node[EventManagerKey] = eventManager;
	return eventManager;
};

export const setEventHandlers = (
	el: Element,
	events: Events | null | undefined,
) => {
	if (!events) {
		return;
	}

	const manager = getEventManager(el);
	for (const [name, handler] of Object.entries(events)) {
		// @ts-expect-error Avoid type checking for specific events/handlers
		manager.setEvent(name, handler);
	}
};

export const addOrReplaceEventHandler = (
	el: Element,
	type: string,
	handler: EventHandler<EventName, Element>,
) => {
	getEventManager(el).setEvent(type as never, handler);
};

export const removeEventHandler = (el: Element, type: string) => {
	getEventManager(el).deleteEvent(type as never);
};

export const clearEventHandlers = (el: Element) => {
	getEventManager(el).clear();
};
