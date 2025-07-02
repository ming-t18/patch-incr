import type {
	Attrs,
	ChildConstruction,
	ElementConstruction,
	Events,
} from "../types";

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
