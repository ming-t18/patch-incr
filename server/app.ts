import { elem, elem0, elem0Events, elemEvents } from "../src/dom/construct";
import { DOMRoot, type Dispatch } from "../src/dom/mount";
import type { RenderIF, StateDispatch } from "../src/dom/render";
import type { ElementConstruction } from "../src/dom/types";
import { bind } from "../src/incr/bind";
import { atomicFunc, constant } from "../src/incr/builder";
import { composeMemoL } from "../src/incr/compose/memo";
import { accessPath } from "../src/incr/struct/access";
import { template } from "../src/incr/struct/assign";
import {
	type TodoAction,
	TodoActionType,
	type TodoState,
	todoReducer,
} from "../src/todo_state";

const accessItems = accessPath<
	TodoState["items"],
	StateDispatch<TodoState, TodoAction>
>(["state", "items"]);
const accessEditingIndex = accessPath<
	TodoState["editingIndex"],
	StateDispatch<TodoState, TodoAction>
>(["state", "editingIndex"]);
const accessDispatch = accessPath<
	Dispatch<TodoAction>,
	StateDispatch<TodoState, TodoAction>
>(["dispatch"]);

export const renderTodoItems: RenderIF<TodoState, TodoAction> = bind(
	accessDispatch,
	(dispatch) =>
		composeMemoL(
			accessItems,
			atomicFunc(
				(items: TodoState["items"]): ElementConstruction =>
					elem0(
						"ul",
						items.map(({ done, text }, index) =>
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
			),
		),
);

export const renderEditor: RenderIF<TodoState, TodoAction> = bind(
	atomicFunc(
		({ state }: StateDispatch<TodoState, TodoAction>): boolean =>
			typeof state.editingIndex === "number",
	),
	(hasEditingIndex) => {
		if (!hasEditingIndex) {
			return constant<
				ElementConstruction,
				StateDispatch<TodoState, TodoAction>
			>(elem0("div"));
		}

		return template(
			{
				dispatch: accessDispatch,
				editingText: atomicFunc(({ state: { items, editingIndex } }) =>
					typeof editingIndex === "number" ? items[editingIndex].text : "",
				),
			},
			({ editingText, dispatch }): ElementConstruction => {
				return elemEvents(
					"input",
					{
						type: "text",
						value: editingText,
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
			},
		);
	},
);

export const renderTodo: RenderIF<TodoState, TodoAction> = template(
	{
		todoItems: renderTodoItems,
		editor: renderEditor,
		dispatch: accessDispatch,
		newItemName: composeMemoL(
			accessItems,
			atomicFunc((items) => `item ${items.length}`),
		),
	},
	({ todoItems, dispatch, editor, newItemName }): ElementConstruction => {
		return elem("div", { id: "todo-app" }, [
			elem0("h1", ["Todo App"]),
			elem0("div", [
				todoItems,
				elem0Events(
					"button",
					{
						click: () =>
							dispatch({
								type: TodoActionType.Add,
								value: newItemName,
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
				editor,
			]),
		]);
	},
);

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
