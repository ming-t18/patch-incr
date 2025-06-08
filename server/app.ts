import { elem, elem0, elem0Events, elemEvents } from "../src/dom/construct";
import { DOMRoot, type Dispatch } from "../src/dom/mount";
import type { RenderIF, StateDispatch } from "../src/dom/render";
import type { ElementConstruction } from "../src/dom/types";
import { bind } from "../src/incr/bind";
import { atomicFunc, constant } from "../src/incr/builder";
import { composeMemoL } from "../src/incr/compose/memo";
import { map } from "../src/incr/list";
import { access, accessPath, record, template } from "../src/incr/struct";
import {
	type TodoAction,
	TodoActionType,
	type TodoItem,
	type TodoState,
	findById,
	todoReducer,
} from "../src/todo_state";

const accessItems = accessPath<
	TodoState["items"],
	StateDispatch<TodoState, TodoAction>
>(["state", "items"]);
const accessNumberOfItems = composeMemoL(
	accessPath<TodoState["items"], StateDispatch<TodoState, TodoAction>>([
		"state",
		"items",
	]),
	atomicFunc((x) => x.length),
);
const accessItemId = access<string, "id", TodoItem>("id");
const accessEditingId = accessPath<
	TodoState["editingId"],
	StateDispatch<TodoState, TodoAction>
>(["state", "editingId"]);
const accessDispatch = accessPath<
	Dispatch<TodoAction>,
	StateDispatch<TodoState, TodoAction>
>(["dispatch"]);

const accessItemDone = access<boolean, "done", TodoItem>("done");

export const renderTodoItems: RenderIF<TodoState, TodoAction> = bind(
	accessDispatch,
	(dispatch) => {
		const mapTodoItems = map(
			template(
				{
					checked: composeMemoL(
						accessItemDone,
						atomicFunc((x: boolean) => x || undefined),
					),
					text: access("text"),
					dispatchStartEditing: composeMemoL(
						accessItemId,
						atomicFunc(
							(id) => () => dispatch({ type: TodoActionType.StartEditing, id }),
						),
					),
					dispatchSetDone: composeMemoL(
						accessItemId,
						atomicFunc((id) => (e: { target: { checked: boolean } }) => {
							dispatch({
								type: TodoActionType.SetDone,
								id,
								done: e.target.checked,
							});
						}),
					),
				},
				({ checked, text, dispatchSetDone, dispatchStartEditing }) =>
					elem0("li", [
						elem0("label", [
							elemEvents(
								"input",
								{ type: "checkbox", checked },
								{
									change: dispatchSetDone,
								},
							),
							elem0("span", [text]),
							elem0Events(
								"button",
								{
									click: dispatchStartEditing,
								},
								["Edit"],
							),
						]),
					]),
			),
		);

		return template(
			{
				list: composeMemoL(accessItems, mapTodoItems),
			},
			({ list }) => elem0("ul", list),
		);
	},
);

export const renderEditor: RenderIF<TodoState, TodoAction> = bind(
	accessDispatch,
	(dispatch) =>
		bind(
			atomicFunc(
				({ state }: StateDispatch<TodoState, TodoAction>): boolean =>
					typeof state.editingId === "string",
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
						editingText: composeMemoL(
							record({
								items: accessItems,
								editingId: accessEditingId,
							}),
							atomicFunc(({ items, editingId }) => {
								if (typeof editingId !== "string") {
									return "";
								}

								const index = findById(items, editingId);
								return index !== -1 ? items[index].text : "";
							}),
						),
					},
					({ editingText }): ElementConstruction => {
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
		),
);

export const renderTodoApp: RenderIF<TodoState, TodoAction> = bind(
	accessDispatch,
	(dispatch) =>
		template(
			{
				todoItems: renderTodoItems,
				editor: renderEditor,
				dispatchAddItem: composeMemoL(
					accessNumberOfItems,
					atomicFunc(
						(n) => () =>
							dispatch({
								type: TodoActionType.Add,
								value: `item ${n}`,
							}),
					),
				),
				dispatchClear: constant(() => dispatch({ type: TodoActionType.Clear })),
				numberOfItems: accessNumberOfItems,
			},
			({
				todoItems,
				editor,
				dispatchAddItem,
				dispatchClear,
				numberOfItems,
			}): ElementConstruction => {
				return elem("div", { id: "todo-app" }, [
					elem0("h1", ["Todo App ", "(", numberOfItems, ")"]),
					elem0("div", [
						todoItems,
						elem0Events(
							"button",
							{
								click: dispatchAddItem,
							},
							["Add"],
						),
						elem0Events("button", { click: dispatchClear }, ["Clear"]),
						elem0("hr"),
						editor,
					]),
				]);
			},
		),
);

const initState: TodoState = {
	counter: 3,
	items: [
		{ done: true, text: "Hello, world!", id: "id0" },
		{ done: false, text: "Update app", id: "id1" },
		{ done: false, text: "Add event handlers", id: "id2" },
	],
	editingId: null,
};

const load = () => {
	const root = document.getElementById("root");
	if (!root) {
		console.error("root not found");
		return;
	}

	const dom = new DOMRoot(root, initState, todoReducer, renderTodoApp);
	const _teardown = dom.connect();
};

// document.body.addEventListener('load', load);
if (globalThis.document) {
	load();
}
