import type {
	AttrValue,
	ChildConstruction,
	ElementConstruction,
} from "../types";
import { parseProps as decomposeProps, type Props } from "./typedProps";

export type ReactCreateElement = <TagName extends string>(
	tagName: TagName,
	props: Props,
	...children: ChildConstruction[]
) => ElementConstruction;

export const createElement: ReactCreateElement = (
	tagName,
	props?: Props | null | undefined,
	...childrenFromArg: ChildConstruction[]
): ElementConstruction => {
	const { children, attrs, events } = decomposeProps(props || {});
	return {
		tag: tagName,
		attrs,
		events,
		children: children ?? childrenFromArg,
	};
};

export type GetPropValueType<Name> = Name extends "children"
	? ChildConstruction | ChildConstruction[]
	: Name extends `on${infer Event}`
		? Function
		: AttrValue | ChildConstruction | ChildConstruction[];

export namespace JSX {
	export type IntrinsicElements = Record<
		string,
		{
			[key in string]: GetPropValueType<key>;
		}
	>;
	export type Element = ElementConstruction;
}
