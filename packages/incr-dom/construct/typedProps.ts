import { isTemplatePlaceholder } from "incr/builder/struct/assign";
import type { Attrs, AttrValue, Events } from "../types";

export interface HTMLElementMap {
	a: HTMLAnchorElement;
	area: HTMLAreaElement;
	audio: HTMLAudioElement;
	base: HTMLBaseElement;
	body: HTMLBodyElement;
	br: HTMLBRElement;
	button: HTMLButtonElement;
	canvs: HTMLCanvasElement;
	data: HTMLDataElement;
	dl: HTMLDataListElement;
	dialog: HTMLDialogElement;
	div: HTMLDivElement;
	embed: HTMLEmbedElement;
	fieldset: HTMLFieldSetElement;
	form: HTMLFormElement;
	h1: HTMLHeadingElement;
	h2: HTMLHeadingElement;
	h3: HTMLHeadingElement;
	h4: HTMLHeadingElement;
	h5: HTMLHeadingElement;
	h6: HTMLHeadingElement;
	head: HTMLHeadElement;
	hr: HTMLHRElement;
	html: HTMLHtmlElement;
	iframe: HTMLIFrameElement;
	image: HTMLImageElement;
	input: HTMLInputElement;
	mod: HTMLModElement;
	label: HTMLLabelElement;
	legend: HTMLLegendElement;
	li: HTMLLIElement;
	link: HTMLLinkElement;
	map: HTMLMapElement;
	meta: HTMLMetaElement;
	object: HTMLObjectElement;
	ol: HTMLOListElement;
	optgroup: HTMLOptGroupElement;
	option: HTMLOptionElement;
	p: HTMLParagraphElement;
	// @ts-ignore TS6385 Deprecated
	param: HTMLParamElement;
	pre: HTMLPreElement;
	progress: HTMLProgressElement;
	quote: HTMLQuoteElement;
	slot: HTMLSlotElement;
	script: HTMLScriptElement;
	select: HTMLSelectElement;
	source: HTMLSourceElement;
	span: HTMLSpanElement;
	style: HTMLStyleElement;
	table: HTMLTableElement;
	td: HTMLTableCellElement;
	th: HTMLTableCellElement;
	tr: HTMLTableRowElement;
	thead: HTMLTableSectionElement;
	tbody: HTMLTableSectionElement;
	template: HTMLTemplateElement;
	textarea: HTMLTextAreaElement;
	title: HTMLTitleElement;
	track: HTMLTrackElement;
	ul: HTMLUListElement;
	video: HTMLVideoElement;
	header: HTMLUnknownElement;
	main: HTMLUnknownElement;
	footer: HTMLUnknownElement;
}

export type TagName = keyof HTMLElementMap;

export type OnPropName = `on${keyof ElementEventMap[keyof ElementEventMap]}`;
export type UndoOnPropName<OnName extends `on${string}`> =
	OnName extends `on${infer Name}` ? Name : never;

export type GetEventType<T extends string> =
	Lowercase<T> extends keyof ElementEventMap
		? ElementEventMap[Lowercase<T> & keyof ElementEventMap]
		: never;

export type EventProps = {
	[onName in OnPropName]: (
		this: Element,
		event: GetEventType<UndoOnPropName<onName>>,
	) => void;
};

// biome-ignore lint/complexity/noBannedTypes: intentional type criteria (Function)
export type Props = Record<string, AttrValue | Function>;

export const parseProps = (props: Props): { attrs: Attrs; events: Events } => {
	const attrs: Attrs = {};
	const events: Events = {};
	for (const [key, value] of Object.entries(props)) {
		if (key.startsWith("on")) {
			if (!isTemplatePlaceholder(value) && typeof value !== "function") {
				throw new TypeError(`parseProps: event prop ${key} must be a function`);
			}
			// @ts-expect-error TemplatePlaceholder type check
			events[key.substring(2).toLowerCase()] = value;
		} else {
			if (!isTemplatePlaceholder(value) && typeof value === "function") {
				throw new TypeError(
					`parseProps: attribute prop ${key} must not be a function`,
				);
			}
			attrs[key] = value as never;
		}
	}
	return { attrs, events };
};
