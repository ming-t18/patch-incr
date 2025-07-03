import type { ChildConstruction, ElementConstruction } from "../types";
import { parseProps as decomposeProps, type Props } from "./typedProps";

export type ReactCreateElement = <TagName extends string>(
	tagName: TagName,
	props: Props,
	...children: ChildConstruction[]
) => ElementConstruction;

export const createElement: ReactCreateElement = (
	tagName,
	props: Props,
	...children: ChildConstruction[]
): ElementConstruction => {
	const { attrs, events } = decomposeProps(props);
	return {
		tag: tagName,
		attrs,
		events,
		children,
	};
};
