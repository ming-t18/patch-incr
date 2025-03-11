// biome-ignore lint/complexity/noBannedTypes: Won't type check functions
export type Handler = Function;

export interface Events {
	[eventName: string]: Handler;
}

export type AttrValue = string | number | bigint | boolean | bigint;
export interface Attrs {
	[attr: string]: AttrValue | null | undefined;
}

export type TextConstruction =
	| string
	| number
	| bigint
	| boolean
	| null
	| undefined;

export type ChildConstruction = TextConstruction | ElementConstruction;

export interface ElementConstruction {
	tag: string;
	attrs?: Attrs | null;
	events?: Events | null;
	children?: ChildConstruction[] | null;
}

export type DOMConstruction = ElementConstruction;
