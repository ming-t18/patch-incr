import type { ChildConstruction, ElementConstruction } from "../types";
import { type Props, parseProps, type TagName } from "./typedProps";

export interface VanJSTag {
	(props: Props, ...children: ChildConstruction[]): ElementConstruction;
	(...children: ChildConstruction[]): ElementConstruction;
}

export type Tags = Record<TagName, VanJSTag>;

const isProps = (x: unknown): x is Props => {
	if (!(typeof x === "object" && x !== null)) {
		return false;
	}

	return !("tag" in x && typeof x.tag === "string");
};

export const makeTagFactory: (tagName: string) => VanJSTag = (
	tagName: string,
): VanJSTag => {
	return (...args: unknown[]): ElementConstruction => {
		if (args.length === 0) {
			return { tag: tagName };
		}

		if (!isProps(args[0])) {
			return {
				tag: tagName,
				children: args as never[],
			};
		}
		const { attrs, events } = parseProps(args[0]);
		return {
			tag: tagName,
			attrs,
			events,
			children: args.slice(1) as never[],
		};
	};
};

const TagsHandler: ProxyHandler<Tags> = {
	get(target, tagName, receiver) {
		if (typeof tagName !== "string" || tagName === "") {
			return Reflect.get(target, tagName, receiver);
		}

		if (Object.hasOwn(target, tagName)) {
			return target[tagName as TagName];
		}

		const tagFactory = makeTagFactory(tagName);
		target[tagName as TagName] = tagFactory;
		return tagFactory;
	},
};

export const tags: Tags = new Proxy({} as never, TagsHandler);
