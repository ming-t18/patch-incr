import { elem, elem0, elem0Events, elemEvents } from "../src/dom/construct";
import { type Dispatch, DOMRoot } from "../src/dom/mount";
import type { RenderIF, StateDispatch } from "../src/dom/render";
import type { ElementConstruction } from "../src/dom/types";
import { map } from "../src/incr/array";
import { bind } from "../src/incr/bind";
import { atomicFunc } from "../src/incr/builder";
import { composeMemoL } from "../src/incr/compose/memo";
import { access, accessPath, record, template } from "../src/incr/struct";
import type { IF } from "../src/incr/types";
import {
	type TodoAction,
	TodoActionType,
	type TodoItem,
	type TodoState,
	todoReducer,
} from "../src/todo_state";

const accessItems = accessPath<
	TodoState["items"],
	StateDispatch<TodoState, TodoAction>
>(["state", "items"]);
const accessNumberOfItemsLeft = composeMemoL(
	accessPath<TodoState["items"], StateDispatch<TodoState, TodoAction>>([
		"state",
		"items",
	]),
	atomicFunc(
		(x) => x.length - x.reduce((s: number, { done }) => (done ? s + 1 : s), 0),
	),
);
const accessItemId = access<string, "id", TodoItem>("id");
const _accessEditingId = accessPath<
	TodoState["editingId"],
	StateDispatch<TodoState, TodoAction>
>(["state", "editingId"]);
const accessDispatch = accessPath<
	Dispatch<TodoAction>,
	StateDispatch<TodoState, TodoAction>
>(["dispatch"]);

const accessItemText = access<string, "text", TodoItem>("text");
const accessItemDone = access<boolean, "done", TodoItem>("done");
const accessItemEditing = access<boolean, "editing", TodoItem>("editing");

export const renderTodoItems: RenderIF<TodoState, TodoAction> = bind(
	accessDispatch,
	(dispatch) => {
		const renderEditor: IF<TodoItem, ElementConstruction> = template(
			{
				value: accessItemText,
				events: composeMemoL(
					accessItemId,
					atomicFunc((id: string) => {
						const handleSubmit = (value: string) => {
							if (!value) {
								dispatch({
									type: TodoActionType.Remove,
									id,
								});
							} else {
								dispatch({
									type: TodoActionType.EditText,
									value,
								});
								requestAnimationFrame(() => {
									dispatch({ type: TodoActionType.StopEditing });
								});
							}
						};
						return {
							keydown: (e: KeyboardEvent) => {
								if (e.key === "Escape") {
									dispatch({ type: TodoActionType.StopEditing });
								} else if (e.key === "Enter") {
									handleSubmit((e.target as HTMLInputElement).value);
								}
							},
							blur: (e: KeyboardEvent) =>
								handleSubmit((e.target as HTMLInputElement).value),
						};
					}),
				),
			},
			({ value, events }) =>
				elem("div", { class: "input-container" }, [
					elemEvents(
						"input",
						{ class: "edit", id: "edit-todo-input", value },
						events,
					),
					elem("label", { class: "visually-hidden", for: "edit-todo-input" }, [
						"Edit Todo Input ",
					]),
				]),
		);

		const mapTodoItems: IF<TodoItem[], ElementConstruction[]> = map<
			TodoItem,
			ElementConstruction
		>(
			template(
				{
					liClass: composeMemoL(
						record([accessItemEditing, accessItemDone]),
						atomicFunc(([editing, completed]) =>
							!editing && !completed
								? ""
								: `${editing ? "editing" : ""} ${completed ? "completed" : ""}`,
						),
					),
					checked: composeMemoL(
						accessItemDone,
						atomicFunc((x: boolean) => x || undefined),
					),
					text: accessItemText,
					dispatchStartEditing: composeMemoL(
						accessItemId,
						atomicFunc(
							(id) => () => dispatch({ type: TodoActionType.StartEditing, id }),
						),
					),
					dispatchRemove: composeMemoL(
						accessItemId,
						atomicFunc(
							(id) => () => dispatch({ type: TodoActionType.Remove, id }),
						),
					),
					dispatchSetDone: composeMemoL(
						accessItemId,
						atomicFunc((id) => (e: KeyboardEvent) => {
							dispatch({
								type: TodoActionType.SetDone,
								id,
								done: (e.target as HTMLInputElement).checked,
							});
							e.preventDefault();
						}),
					),
					editorPart: renderEditor,
				},
				({
					liClass,
					checked,
					text,
					editorPart,
					dispatchSetDone,
					dispatchStartEditing,
					dispatchRemove,
				}) =>
					elem("li", { class: liClass }, [
						elem("div", { class: "view" }, [
							elemEvents(
								"input",
								{ class: "toggle", type: "checkbox", checked },
								{
									change: dispatchSetDone,
								},
							),
							elem0Events("label", { dblclick: dispatchStartEditing }, [text]),
							elemEvents(
								"button",
								{ class: "destroy" },
								{
									click: dispatchRemove,
								},
							),
						]),
						editorPart,
					]),
			),
		);

		return template(
			{
				list: composeMemoL(accessItems, mapTodoItems),
			},
			({ list }) => elem("ul", { class: "todo-list" }, list),
		);
	},
);

export const renderTodoApp: RenderIF<TodoState, TodoAction> = bind(
	accessDispatch,
	(dispatch) =>
		template(
			{
				todoItems: renderTodoItems,
				numberOfItemsLeft: accessNumberOfItemsLeft,
			},
			({ todoItems, numberOfItemsLeft }): ElementConstruction => {
				return elem("div", { id: "todo-app" }, [
					elem("header", { class: "header" }, [
						elem0("h1", ["todos"]),
						elemEvents(
							"input",
							{
								type: "text",
								class: "new-todo",
								placeholder: "What needs to be done?",
								autofocus: true,
							},
							{
								keypress: (e: KeyboardEvent) => {
									if (e.key !== "Enter") {
										return;
									}

									const input = e.target as HTMLInputElement;
									if (input.value.trim()) {
										dispatch({
											type: TodoActionType.Add,
											value: input.value,
										});
										e.preventDefault();
									}
								},
							},
						),
					]),
					elem("main", { class: "main" }, [
						elem("div", { class: "toggle-all-container" }, [
							elemEvents(
								"input",
								{ class: "toggle-all", type: "checkbox" },
								{
									change: () => dispatch({ type: TodoActionType.ToggleAll }),
								},
							),
							elem("label", { class: "toggle-all-label", for: "toggle-all" }, [
								"Toggle All Input",
							]),
						]),
						todoItems,
						elem("footer", { class: "footer" }, [
							elem("span", { class: "todo-count" }, [
								numberOfItemsLeft,
								" items left!",
							]),
							elem("ul", { class: "filters" }, [
								elem0("li", [
									elem("a", { href: "#/", class: "selected" }, ["All"]),
								]),
								elem0("li", [elem("a", { href: "#/active" }, ["Active"])]),
								elem0("li", [
									elem("a", { href: "#/completed" }, ["Completed"]),
								]),
							]),
							elemEvents(
								"button",
								{ class: "clear-completed" },
								{
									click: () =>
										dispatch({ type: TodoActionType.ClearCompleted }),
								},
								["Clear completed"],
							),
						]),
					]),
				]);
			},
		),
);

const initState: TodoState = {
	counter: 3,
	items: [
		{ done: true, editing: false, text: "Hello, world!", id: "id0" },
		{ done: false, editing: false, text: "Update app", id: "id1" },
		{ done: false, editing: false, text: "Add event handlers", id: "id2" },
	],
	editingId: null,
};

const load = () => {
	const root = document.getElementById("root");
	if (!root) {
		return;
	}

	const dom = new DOMRoot(root, initState, todoReducer, renderTodoApp);
	const _teardown = dom.connect();
};

// document.body.addEventListener('load', load);
if (globalThis.document) {
	load();
}
