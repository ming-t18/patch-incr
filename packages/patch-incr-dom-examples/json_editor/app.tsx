import { atomicFunc, constant, recurse } from "patch-incr/builder";
import { map } from "patch-incr/builder/array";
import { bindMemo } from "patch-incr/builder/bind";
import { composeMemo, composer } from "patch-incr/builder/compose/memo";
import { switchCase } from "patch-incr/builder/cond";
import { template, template0 } from "patch-incr/builder/struct";
import { accessWith, accessWithFor } from "patch-incr/builder/struct/access";
import { entries } from "patch-incr/builder/struct/entries";
import type { Path } from "patch-incr/patch";
import type { IF } from "patch-incr/types";
import { type Dispatch, DOMRoot } from "patch-incr-dom/mount";
import type { RenderIF, StateDispatch } from "patch-incr-dom/render";
import type { ElementConstruction } from "patch-incr-dom/types";
import { type EditorAction, type EditorState, editorReducer } from "./state";

const _SD = accessWithFor<StateDispatch<EditorState, EditorAction>>();
const _S = accessWithFor<EditorState>();
const _data = _S((x) => x.data);
const _State = _SD((x) => x.state);
const _Dispatch = _SD((x) => x.dispatch);

const KindNull = Symbol.for("KindNull");
const KindArray = Symbol.for("KindArray");
const KindObject = Symbol.for("KindObject");
const KindString = Symbol.for("KindString");
const KindNumber = Symbol.for("KindNumber");
const KindBoolean = Symbol.for("KindBoolean");
const KindOther = Symbol.for("KindOther");

const getKind = (x: unknown) => {
	if (x === null || x === undefined) {
		return KindNull;
	}
	if (Array.isArray(x)) {
		return KindArray;
	}
	if (typeof x === "object") {
		return KindObject;
	}
	if (typeof x === "string") {
		return KindString;
	}
	if (typeof x === "boolean") {
		return KindBoolean;
	}
	if (typeof x === "number" || typeof x === "bigint") {
		return KindNumber;
	}
	return KindOther;
};

interface RenderValueProps<T = unknown> {
	path: Path;
	value: T;
}

const _RVP = accessWithFor<RenderValueProps>();
const getPath = _RVP((x) => x.path);
const getValue = _RVP((x) => x.value);

const getInitialProps: IF<unknown, RenderValueProps> = template0(
	(data): RenderValueProps => ({ path: [], value: { data } }),
);

const getPairKey = accessWith((x: [string, unknown]) => x[0]);
const getPairValue = accessWith((x: [string, unknown]) => x[1]);

const getRenderPair = (
	path0: Path,
	rec: IF<RenderValueProps, ElementConstruction>,
): IF<[string, unknown], ElementConstruction> =>
	switchCase(
		([, value]) => getKind(value),
		(kind) => {
			const componentStyle = `margin-left: ${path0.length}em`;
			const clickzoneStyle = `width: 2em`;
			const openClose = kind === KindArray ? "[]" : "{}";
			if (!(kind === KindArray || kind === KindObject)) {
				return template(
					{
						key: getPairKey,
						value: composer(
							template(
								{
									path: atomicFunc(([key]) => [...path0, key]),
									value: getPairValue,
								},
								({ path, value }): RenderValueProps => ({ path, value }),
							),
						)
							.pipe(rec)
							.build(),
					},
					({ key, value }) => (
						<div
							data-key={key}
							class="jer-collection-element"
							style={componentStyle}
						>
							<div class="jer-value-main-row">
								<div class="jer-clickzone" style={clickzoneStyle}></div>
								<div class="jer-component jer-value-component">
									<div class="jer-value-main-row">
										<span class="jer-key-text">
											{key}
											<span class="jer-key-colon">{":"}</span>
										</span>
										<div class="jer-value-and-buttons">{value}</div>
									</div>
								</div>
							</div>
						</div>
					),
				);
			}

			return template(
				{
					key: getPairKey,
					value: composer(
						template(
							{
								path: atomicFunc(([key]) => [...path0, key]),
								value: getPairValue,
							},
							({ path, value }): RenderValueProps => ({ path, value }),
						),
					)
						.pipe(rec)
						.build(),
				},
				({ key, value }) => (
					<div
						data-key={key}
						class="jer-collection-element"
						style={componentStyle}
					>
						<div class="jer-component jer-collection-component">
							<div class="jer-clickzone" style={clickzoneStyle}></div>
							<div class="jer-collection-header-row">
								<div class="jer-collection-name">
									<div class="jer-collapse-icon jer-accordion-icon"></div>
									<span class="jer-key-text">
										{key}
										<span class="jer-key-colon">{":"}</span>
										<span class="jer-brackets jer-bracket-open">
											{openClose[0]}
										</span>
									</span>
								</div>
							</div>
							{value}
						</div>
						<span class="jer-brackets jer-bracket-outside">{openClose[1]}</span>
					</div>
				),
			);
		},
	);

const getRenderValue = (
	_dispatch: Dispatch<EditorAction>,
): IF<RenderValueProps, ElementConstruction> => {
	return recurse<IF<RenderValueProps, ElementConstruction>>((rec) =>
		bindMemo(
			getPath,
			(path0: Path): IF<RenderValueProps, ElementConstruction> => {
				const renderPair = getRenderPair(path0, rec);
				const renderObject: IF<
					Record<string, unknown>,
					ElementConstruction
				> = template(
					{
						path: constant(JSON.stringify(path0)),
						children: composer(entries<string, unknown>())
							.pipe(map(renderPair))
							.build(),
					},
					({ path, children }) => {
						return (
							<div
								data-path={path}
								class="jer-component jer-collection-component"
								role="list"
							>
								{children}
							</div>
						);
					},
				);

				const renderList: IF<unknown[], ElementConstruction> = template(
					{
						children: composer(entries<string, unknown>())
							.pipe(map(renderPair))
							.build(),
					},
					({ children }) => {
						return (
							<div class="jer-collection-inner" role="list">
								{children}
							</div>
						);
					},
				);

				const renderAsString: IF<unknown, ElementConstruction> = template(
					{
						valueClass: atomicFunc(
							(x: unknown) => `jer-value jer-value-${typeof x}`,
						),
						value: atomicFunc(JSON.stringify),
					},
					({ valueClass, value }) => <div class={valueClass}>{value}</div>,
				);

				return composeMemo(
					getValue,
					switchCase(getKind, (kind) => {
						if (kind === KindArray)
							return renderList as IF<unknown, ElementConstruction>;
						if (kind === KindObject)
							return renderObject as IF<unknown, ElementConstruction>;
						return renderAsString;
					}),
				);
			},
		),
	);
};

const getRenderApp = (
	dispatch: Dispatch<EditorAction>,
): IF<StateDispatch<EditorState, EditorAction>, ElementConstruction> => {
	const renderMain: IF<EditorState, ElementConstruction> = template(
		{
			render: composer(_data)
				.pipe(getInitialProps)
				.pipe(getRenderValue(dispatch))
				.build(),
		},
		({ render }) => (
			<div>
				<h1>{"JSON Editor"}</h1>
				<div class="jer-editor-container">{render}</div>
			</div>
		),
	);
	return composeMemo(_State, renderMain);
};

const renderEditor: RenderIF<EditorState, EditorAction> = bindMemo(
	_Dispatch,
	getRenderApp,
);

const initState: EditorState = {
	data: {
		name: "abc",
		number: 2,
		boolean: true,
		list: [
			{ x: 1, y: 2 },
			{ x: 3, y: 4 },
			{ x: 1, y: 8, nested: { a: "test", b: false, c: 1.2 } },
		],
	},
	isExpandedMap: new Map(),
};

class JsonEditorComponent extends HTMLElement {
	#domRoot: DOMRoot<EditorState, EditorAction> | null;
	constructor() {
		super();
		this.#domRoot = null;
	}

	connectedCallback() {
		console.log("connected");
		this.#domRoot = new DOMRoot(this, initState, editorReducer, renderEditor);
		this.#domRoot.initialize();
	}
}

export const load = () => {
	if (!customElements) return;

	customElements.define("json-editor-app", JsonEditorComponent);
};

if (globalThis.document) {
	load();
}
