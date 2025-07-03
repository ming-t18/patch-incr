import { elem, elemEvents } from "../src/dom/construct";
import type { Props } from "../src/dom/construct/typedProps";
import { tags } from "../src/dom/construct/vanjs";
import { type Dispatch, DOMRoot } from "../src/dom/mount";
import type { RenderIF, StateDispatch } from "../src/dom/render";
import type { ElementConstruction } from "../src/dom/types";
import { filter, map } from "../src/incr/array";
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
	ViewFilter,
} from "../src/todo_state";

const accessViewFilter = accessPath<
	ViewFilter,
	StateDispatch<TodoState, TodoAction>
>(["state", "viewFilter"]);
const accessItems = accessPath<
	TodoItem[],
	StateDispatch<TodoState, TodoAction>
>(["state", "items"]);
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

const getFilteredItems: IF<
	StateDispatch<TodoState, TodoAction>,
	TodoItem[]
> = bind(accessViewFilter, (viewFilter: ViewFilter) => {
	if (viewFilter === ViewFilter.All) {
		return accessItems;
	}

	const pred =
		viewFilter === ViewFilter.Active
			? ({ done }: TodoItem) => !done
			: ({ done }: TodoItem) => done;
	return composeMemoL(composeMemoL(accessItems, filter(pred)), access(0));
});

const {
	div,
	header,
	h1,
	input,
	main,
	label,
	footer,
	span,
	button,
	ul,
	li,
	a: _a,
} = tags;

export const renderTodoItems: RenderIF<TodoState, TodoAction> = bind(
	accessDispatch,
	(dispatch) => {
		const renderEditor: IF<TodoItem, ElementConstruction> = template(
			{
				value: accessItemText,
				events: composeMemoL(
					accessItemId,
					atomicFunc((id: string) => {
						const handleSubmit = (input: HTMLInputElement) => {
							const value = input.value;
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
								dispatch({ type: TodoActionType.StopEditing });
							}
						};
						return {
							keydown: (e: KeyboardEvent) => {
								if (e.key === "Escape") {
									dispatch({ type: TodoActionType.StopEditing });
								} else if (e.key === "Enter") {
									handleSubmit(e.target as HTMLInputElement);
								}
							},
							blur: (e: KeyboardEvent) =>
								handleSubmit(e.target as HTMLInputElement),
						};
					}),
				),
			},
			({ value, events }) =>
				div(
					{ class: "input-container" },
					elemEvents(
						"input",
						{ class: "edit", id: "edit-todo-input", value },
						events,
					),
					label(
						{ class: "visually-hidden", for: "edit-todo-input" },
						"Edit Todo Input ",
					),
				),
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
					li(
						{ class: liClass },
						div(
							{ class: "view" },
							input({
								type: "checkbox",
								class: "toggle",
								checked,
								onchange: dispatchSetDone,
							} as Props),
							label({ ondblclick: dispatchStartEditing }, text),
							button({
								class: "destroy",
								onclick: dispatchRemove,
							}),
						),
						editorPart,
					),
			),
		);

		return template(
			{
				list: composeMemoL(getFilteredItems, mapTodoItems),
			},
			({ list }) => elem("ul", { class: "todo-list" }, list),
		);
	},
);

export const renderFiltersMenu = bind(accessDispatch, (dispatch) =>
	template(
		{
			allClass: composeMemoL(
				accessViewFilter,
				atomicFunc((x) => (x === ViewFilter.All ? "selected" : "")),
			),
			activeClass: composeMemoL(
				accessViewFilter,
				atomicFunc((x) => (x === ViewFilter.Active ? "selected" : "")),
			),
			completedClass: composeMemoL(
				accessViewFilter,
				atomicFunc((x) => (x === ViewFilter.Completed ? "selected" : "")),
			),
		},
		({ allClass, activeClass, completedClass }): ElementConstruction =>
			ul(
				{ class: "filters" },
				li(
					_a(
						{
							href: "#/",
							class: allClass,
							onclick: () =>
								dispatch({
									type: TodoActionType.SetViewFilter,
									viewFilter: ViewFilter.All,
								}),
						},
						"All",
					),
				),
				li(
					_a(
						{
							href: "#/active",
							class: activeClass,

							onclick: () =>
								dispatch({
									type: TodoActionType.SetViewFilter,
									viewFilter: ViewFilter.Active,
								}),
						},
						"Active",
					),
				),
				li(
					_a(
						{
							href: "#/completed",
							class: completedClass,
							onclick: () =>
								dispatch({
									type: TodoActionType.SetViewFilter,
									viewFilter: ViewFilter.Completed,
								}),
						},
						"Completed",
					),
				),
			),
	),
);

const getTodoCountText = composeMemoL(
	accessPath<TodoState["items"], StateDispatch<TodoState, TodoAction>>([
		"state",
		"items",
	]),
	atomicFunc((x) => {
		const count =
			x.length - x.reduce((s: number, { done }) => (done ? s + 1 : s), 0);
		return `${count} item${count !== 1 ? "s" : ""} left!`;
	}),
);

export const renderTodoApp: RenderIF<TodoState, TodoAction> = bind(
	accessDispatch,
	(dispatch) =>
		template(
			{
				todoItems: renderTodoItems,
				todoCountText: getTodoCountText,
				filtersMenu: renderFiltersMenu,
			},
			({ todoItems, todoCountText, filtersMenu }): ElementConstruction =>
				div(
					{ id: "todo-app" },
					header(
						{ class: "header" },
						h1("todos"),
						input({
							type: "text",
							class: "new-todo",
							placeholder: "What needs to be done?",
							autofocus: true,
							onkeypress: (e: KeyboardEvent) => {
								if (e.key !== "Enter") {
									return;
								}

								const input = e.target as HTMLInputElement;
								if (input.value.trim()) {
									dispatch({
										type: TodoActionType.Add,
										value: input.value,
									});
									// the input is already not controlled
									input.value = "";
									e.preventDefault();
								}
							},
						}),
					),
					main(
						{ class: "main" },
						div(
							{ class: "toggle-all-container" },
							input({
								class: "toggle-all",
								type: "checkbox",
								onchange: () => dispatch({ type: TodoActionType.ToggleAll }),
							}),
							label(
								{ class: "toggle-all-label", for: "toggle-all" },
								"Toggle All Input",
							),
						),
						todoItems,
						footer(
							{ class: "footer" },
							span({ class: "todo-count" }, todoCountText),
							filtersMenu,
							button(
								{
									class: "clear-completed",
									onclick: () =>
										dispatch({ type: TodoActionType.ClearCompleted }),
								},
								"Clear completed",
							),
						),
					),
				),
		),
);

const initState: TodoState = {
	counter: 3,
	items: [
		{ done: true, editing: false, text: "Hello, world!", id: "id0" },
		{ done: false, editing: false, text: "Update app", id: "id1" },
		{ done: false, editing: false, text: "Add event handlers", id: "id2" },
	],
	viewFilter: ViewFilter.All,
	editingId: null,
};

// for (let i = 0; i < 100; i++) {
// 	initState.items.push({
// 		done: i % 5 === 0,
// 		editing: false,
// 		text: `Todo Item ${i}`,
// 		id: `added-${i}`,
// 	});
// }

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
