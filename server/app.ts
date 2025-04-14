import { elem, elem0, elem0Events, elemEvents } from "../src/dom/construct";
import { DOMRoot, type Dispatch, observeRemoval } from "../src/dom/mount";
import type { RenderForward, RenderFunc } from "../src/dom/render";
import type { DOMConstruction, ElementConstruction } from "../src/dom/types";
import { type DP, patchesBuilder, struct } from "../src/dual";
import { access } from "../src/dual/access";
import { Finish } from "../src/dual/proxy/access";
import { type Patches, replacePatch } from "../src/incr/patch";
import {
	type TodoAction,
	TodoActionType,
	type TodoState,
	todoReducer,
	todoReducerFunc,
	todoStateReducerOnDraft,
} from "../src/todo_state";

const ste = struct<ElementConstruction, Patches>(patchesBuilder);

export const renderTodoItems: RenderFunc<TodoState, TodoAction> = (
	todoState: DP<TodoState, Patches>,
	dispatch: Dispatch<TodoAction>,
): DP<ElementConstruction, Patches> => {
	return ste(
		elem0(
			"ul",
			todoState.access("items").map(({ done, text }, index) =>
				elem0("li", [
					elem0("label", [
						elemEvents(
							"input",
							{ type: "checkbox", checked: done || undefined },
							{
								change: (e: { target: { checked: boolean } }) => {
									dispatch({
										type: TodoActionType.SetDone,
										index,
										done: e.target.checked,
									});
								},
							},
						),
						elem0("span", [text]),
						elem0Events(
							"button",
							{
								click: () =>
									dispatch({ type: TodoActionType.StartEditing, index }),
							},
							["Edit"],
						),
					]),
				]),
			),
		),
	);
};

export const renderEditor: RenderFunc<TodoState, TodoAction> = (
	todoState: DP<TodoState, Patches>,
	dispatch: Dispatch<TodoAction>,
): DP<ElementConstruction, Patches> => {
	if (typeof todoState.access("editingIndex")[0] !== "number") {
		return ste(elem0("div"));
	}

	return ste(
		elemEvents(
			"input",
			{
				type: "text",
				value: todoState.items[todoState.editingIndex].text,
			},
			{
				change: (e: Event) => {
					dispatch({
						type: TodoActionType.EditText,
						value: (e.target as HTMLInputElement | null)?.value ?? "",
					});
				},
			},
		),
	);
};

export const renderTodo: RenderFunc<TodoState, TodoAction> = (
	todoState: DP<TodoState, Patches>,
	dispatch: Dispatch<TodoAction>,
): DP<ElementConstruction, Patches> => {
	return ste(
		elem("div", { id: "todo-app" }, [
			elem0("h1", ["Todo App"]),
			elem0("div", [
				renderTodoItems(todoState, dispatch),
				elem0Events(
					"button",
					{
						click: () =>
							dispatch({
								type: TodoActionType.Add,
								value: `item ${todoState.items.length}`,
							}),
					},
					["Add"],
				),
				elem0Events(
					"button",
					{ click: () => dispatch({ type: TodoActionType.Clear }) },
					["Clear"],
				),
				elem0("hr"),
				renderEditor(todoState, dispatch),
			]),
		]),
	);
};

const initState: TodoState = {
	items: [
		{ done: true, text: "Hello, world!" },
		{ done: false, text: "Update app" },
		{ done: false, text: "Add event handlers" },
	],
	editingIndex: null,
};

const load = () => {
	const root = document.getElementById("root");
	if (!root) {
		console.error("root not found");
		return;
	}

	new DOMRoot(root, initState, todoReducer, renderTodo);
};

// document.body.addEventListener('load', load);
if (globalThis.document) {
	load();
}
