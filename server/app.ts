import { elem, elem0, elem0Events, elemEvents } from "../src/dom/construct";
import { DOMRoot, type Dispatch, observeRemoval } from "../src/dom/mount";
import type { RenderForward, RenderFunc } from "../src/dom/render";
import type { DOMConstruction, ElementConstruction } from "../src/dom/types";
import { type Patches, replacePatch } from "../src/incr/patch";
import {
	type TodoAction,
	TodoActionType,
	type TodoState,
	todoReducer,
	todoReducerFunc,
	todoStateReducerOnDraft,
} from "../src/todo_state";

export const renderTodoItems = (
	todoState: TodoState,
	dispatch: Dispatch<TodoAction>,
): ElementConstruction => {
	return elem0(
		"ul",
		todoState.items.map(({ done, text }, index) =>
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
	);
};

export const forwardTodoItems: RenderForward<TodoState, TodoAction> =
	(dispatch: Dispatch<TodoAction>) =>
	(state: TodoState, action: TodoAction, domc: DOMConstruction): Patches => {
		return replacePatch(
			renderTodoItems(todoReducerFunc(state, action), dispatch),
		);
	};

export const renderEditor = (
	todoState: TodoState,
	dispatch: Dispatch<TodoAction>,
): ElementConstruction | null => {
	if (typeof todoState.editingIndex !== "number") {
		return null;
	}

	return elemEvents(
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
	);
};

export const forwardEditor: RenderForward<TodoState, TodoAction> =
	(dispatch: Dispatch<TodoAction>) =>
	(state: TodoState, action: TodoAction, domc: DOMConstruction): Patches => {
		return replacePatch(renderEditor(todoReducerFunc(state, action), dispatch));
	};

export const renderTodo: RenderFunc<TodoState, TodoAction> = (
	todoState: TodoState,
	dispatch: Dispatch<TodoAction>,
): ElementConstruction => {
	return elem("div", { id: "todo-app" }, [
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
	]);
};

export const forwardTodo: RenderForward<TodoState, TodoAction> =
	(dispatch: Dispatch<TodoAction>) =>
	(state: TodoState, action: TodoAction, domc: DOMConstruction): Patches => {
		return replacePatch(renderTodo(todoReducerFunc(state, action), dispatch));
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
