import { atomicFunc } from "patch-incr/builder";
import { map } from "patch-incr/builder/array";
import { distAssign } from "patch-incr/builder/array/dist";
import { bindMemo } from "patch-incr/builder/bind";
import { composeMemo, composer } from "patch-incr/builder/compose";
import { composeMemoL } from "patch-incr/builder/compose/memo";
import {
	accessFor,
	accessPathFor,
	record,
	template,
	tupleFor,
} from "patch-incr/builder/struct";
import type { IF } from "patch-incr/types";
import { tags } from "patch-incr-dom/construct/vanjs";
import { type Dispatch, DOMRoot } from "patch-incr-dom/mount";
import type { RenderIF, StateDispatch } from "patch-incr-dom/render";
import type { ElementConstruction } from "patch-incr-dom/types";
import {
	ActionType,
	type AppAction,
	type AppState,
	appReducer,
	type Item,
	initState,
} from "./app_state";

const accessS = accessFor<AppState>();

const accessSD = accessFor<StateDispatch<AppState, AppAction>>();
// const accessPathSD = accessPathFor<StateDispatch<AppState, AppAction>>();

const accessState = accessSD("state");
const accessDispatch = accessSD("dispatch");

const { div, h1, span, button, table, tbody, tr, td, a: _a } = tags;

interface ItemWithSelected extends Item {
	selected: number;
}

interface ItemWithIsSelected extends Item {
	isSelected: boolean;
}

const accessI = accessFor<ItemWithSelected>();
const accessIS = accessFor<ItemWithIsSelected>();

const getItemSelected_NonIncr = ({ data, selected }: AppState): ItemWithIsSelected[] =>
  data.map(({ id, label }) => ({ id, label, isSelected: selected === id }));

const getItemSelected: IF<AppState, ItemWithIsSelected[]> = composer(
  tupleFor<AppState>()(accessS("data"), accessS("selected"))
)
	.pipe(distAssign<Item, "selected", number>("selected"))
	.pipe(
		map(
			record({
				id: accessI("id"),
				label: accessI("label"),
				isSelected: composeMemoL(
					tupleFor<ItemWithSelected>()(accessI("selected"), accessI("id")),
					atomicFunc(([s, i]) => s === i),
				),
			}),
		),
	)
	.build();

const getRenderApp = (
	dispatch: Dispatch<AppAction>,
): IF<StateDispatch<AppState, AppAction>, ElementConstruction> => {
	const renderJumbotron: IF<
		StateDispatch<AppState, AppAction>,
		ElementConstruction
	> = template({}, (_: {}) =>
		div(
			{ class: "jumbotron" },
			div(
				{ class: "row" },
				div({ class: "col-md-6" }, h1("patch-incr-dom")),
				div(
					{ class: "col-md-6" },
					div(
						{ class: "row" },
						button(
							{ id: "run", onclick: () => dispatch({ type: ActionType.RUN }) },
							"Create 1,000 rows",
						),
						button(
							{
								id: "runlots",
								onclick: () => dispatch({ type: ActionType.RUN_LOTS }),
							},
							"Create 10,000 rows",
						),
						button(
							{ id: "add", onclick: () => dispatch({ type: ActionType.ADD }) },
							"Append 1,000 rows",
						),
						button(
							{
								id: "update",
								onclick: () => dispatch({ type: ActionType.UPDATE }),
							},
							"Update every 10th row",
						),
						button(
							{
								id: "clear",
								onclick: () => dispatch({ type: ActionType.CLEAR }),
							},
							"Clear",
						),
						button(
							{
								id: "swaprows",
								onclick: () => dispatch({ type: ActionType.SWAP_ROWS }),
							},
							"Swap Rows",
						),
					),
				),
			),
		),
	);

	const renderRow: IF<ItemWithIsSelected, ElementConstruction> = template(
		{
			id: accessIS("id"),
			selectedClass: composeMemoL(
				accessIS("isSelected"),
				atomicFunc((selected) => (selected ? "danger" : "")),
			),
			label: accessIS("label"),
		},
		({ id, label, selectedClass }) =>
			tr(
				{ class: selectedClass },
				td({ class: "col-md-1" }, id),
				td(
					{ class: "col-md-4" },
					_a(
						{ onclick: () => dispatch({ type: ActionType.SELECT, id }) },
						label,
					),
				),
				td(
					{ class: "col-md-1" },
					_a(
						{ onclick: () => dispatch({ type: ActionType.REMOVE, id }) },
						span({ class: "glyphicon glyphicon-remove", "aria-hidden": true }),
					),
				),
				td({ class: "col-md-6" }),
			),
	);

	const renderRows: IF<AppState, ElementConstruction[]> = composeMemoL(
		getItemSelected,
		map(renderRow),
	);

	const renderMain: IF<AppState, ElementConstruction> = template(
		{
			jumbotron: renderJumbotron,
			rows: renderRows,
		},
		({ jumbotron, rows }) =>
			div(
				{ class: "container" },
				jumbotron,
				table(
					{ class: "table table-hover table-striped test-data" },
					{
						tag: "tbody",
						children: rows,
					},
					span({
						"aria-hidden": true,
						class: "preloadicon glyphicon glyphicon-remove",
					}),
				),
			),
	);

	return composeMemo(accessState, renderMain);
};

export const renderApp: RenderIF<AppState, AppAction> = bindMemo(
	accessDispatch,
	getRenderApp,
);

export const load = () => {
	const root = document.getElementById("main");
	if (!root) {
		return;
	}

	const domRoot = new DOMRoot(root, initState, appReducer, renderApp);
	domRoot.debug = true;
	domRoot.initialize();
};

if (globalThis.document) {
	load();
}
