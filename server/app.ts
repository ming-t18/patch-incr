import { elem, elem0, elem0Events, elemEvents } from "../src/dom/construct";
import { DOMRoot, type Dispatch } from "../src/dom/mount";
import type { RenderFunc } from "../src/dom/render";
import type { ElementConstruction } from "../src/dom/types";
import { atomicFunc } from "../src/incr/builder";
import {
	type TodoAction,
	TodoActionType,
	type TodoState,
	todoReducer,
} from "../src/todo_state";

export const renderTodoItems: RenderFunc<TodoState, TodoAction> = ({
	state: todoState,
	dispatch,
}) => {
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

export const renderEditor: RenderFunc<TodoState, TodoAction> = ({
	state: todoState,
	dispatch,
}) => {
	if (typeof todoState.editingIndex !== "number") {
		return elem0("div");
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

export const renderTodo = (args: {
	state: TodoState;
	dispatch: Dispatch<TodoAction>;
}): ElementConstruction => {
	const { state: todoState, dispatch } = args;
	return elem("div", { id: "todo-app" }, [
		elem0("h1", ["Todo App"]),
		elem0("div", [
			renderTodoItems(args),
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
				{ click: () => args.dispatch({ type: TodoActionType.Clear }) },
				["Clear"],
			),
			elem0("hr"),
			renderEditor(args),
		]),
	]);
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

	new DOMRoot(root, initState, todoReducer, atomicFunc(renderTodo));
};

// document.body.addEventListener('load', load);
if (globalThis.document) {
	load();
}
