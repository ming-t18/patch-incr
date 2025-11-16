import { atomicFunc } from "patch-incr/builder";
import { filter, map } from "patch-incr/builder/array";
import { bind, bindMemo } from "patch-incr/builder/bind";
import { composeMemoL, composer } from "patch-incr/builder/compose/memo";
import {
	access,
	accessFor,
	accessPathFor,
	template,
	tupleFor,
} from "patch-incr/builder/struct";
import type { IF } from "patch-incr/types";
import { elem, elemEvents } from "patch-incr-dom/construct";
import type { Props } from "patch-incr-dom/construct/typedProps";
import { tags } from "patch-incr-dom/construct/vanjs";
import { type Dispatch, DOMRoot } from "patch-incr-dom/mount";
import type { RenderIF, StateDispatch } from "patch-incr-dom/render";
import type { ElementConstruction } from "patch-incr-dom/types";
import {
	type TodoAction,
	TodoActionType,
	type TodoItem,
	type TodoState,
	todoReducer,
	ViewFilter,
} from "./todo_state";

const accessPathSD = accessPathFor<StateDispatch<TodoState, TodoAction>>();
const accessSD = accessFor<StateDispatch<TodoState, TodoAction>>();
const accessTodoItem = accessFor<TodoItem>();

const accessViewFilter = accessPathSD<["state", "viewFilter"], ViewFilter>([
	"state",
	"viewFilter",
]);
const accessItems = accessPathSD<["state", "items"], TodoItem[]>([
	"state",
	"items",
]);
const accessItemId = accessTodoItem("id");
const accessDispatch = accessSD("dispatch");

const accessItemText = accessTodoItem("text");
const accessItemDone = accessTodoItem("done");
const accessItemEditing = accessTodoItem("editing");

const getFilteredItems: IF<
	StateDispatch<TodoState, TodoAction>,
	TodoItem[]
> = bind(accessViewFilter, (viewFilter: ViewFilter): typeof accessItems => {
	if (viewFilter === ViewFilter.All) {
		return accessItems;
	}

	const pred =
		viewFilter === ViewFilter.Active
			? ({ done }: TodoItem) => !done
			: ({ done }: TodoItem) => done;
	return composer(accessItems)
		.pipe(filter(pred), access<TodoItem[], 0, [TodoItem[], number[]]>(0))
		.build();
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

const getTodoCountText = composer(
	accessPathSD<["state", "items"], TodoState["items"]>(["state", "items"]),
)
	.pipe(
		atomicFunc((x: TodoState["items"]) => {
			const count =
				x.length - x.reduce((s: number, { done }) => (done ? s + 1 : s), 0);
			return `${count} item${count !== 1 ? "s" : ""} left!`;
		}),
	)
	.build();

const getRenderTodoApp = (dispatch: Dispatch<TodoAction>) => {
	const renderEditor: IF<TodoItem, ElementConstruction> = template(
		{
			value: accessItemText,
			events: composer(accessItemId)
				.pipe(
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
				)
				.build(),
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

	const getPair /*: IF<TodoItem, [boolean, boolean]> */ = tupleFor<TodoItem>()(
		accessItemEditing,
		accessItemDone,
	);
	const mapTodoItems: IF<TodoItem[], ElementConstruction[]> = map<
		TodoItem,
		ElementConstruction
	>(
		template(
			{
				liClass: composer(getPair)
					.pipe(
						atomicFunc(([editing, completed]: [boolean, boolean]) =>
							!editing && !completed
								? ""
								: `${editing ? "editing" : ""} ${completed ? "completed" : ""}`,
						),
					)
					.build(),
				checked: composeMemoL(
					accessItemDone,
					atomicFunc((x: boolean) => x || undefined),
				),
				text: accessItemText,
				dispatchStartEditing: composeMemoL(
					accessItemId,
					atomicFunc(
						(id: string) => () =>
							dispatch({ type: TodoActionType.StartEditing, id }),
					),
				),
				dispatchRemove: composeMemoL(
					accessItemId,
					atomicFunc(
						(id: string) => () => dispatch({ type: TodoActionType.Remove, id }),
					),
				),
				dispatchSetDone: composeMemoL(
					accessItemId,
					atomicFunc((id: string) => (e: KeyboardEvent) => {
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

	const renderTodoItems = template(
		{
			list: composeMemoL(getFilteredItems, mapTodoItems),
		},
		({ list }) => elem("ul", { class: "todo-list" }, list),
	);

	const renderFiltersMenu = template(
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
	);

	return template(
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
	);
};

export const renderTodoApp: RenderIF<TodoState, TodoAction> = bindMemo(
	accessDispatch,
	getRenderTodoApp,
);

export const initState: TodoState = {
	counter: 3,
	items: [
		{ done: true, editing: false, text: "Hello, world!", id: "id0" },
		{ done: false, editing: false, text: "Update app", id: "id1" },
		{ done: false, editing: false, text: "Add event handlers", id: "id2" },
	],
	viewFilter: ViewFilter.All,
	editingId: null,
};

for (let i = 0; i < 10; i++) {
	initState.items.push({
		done: i % 5 === 0,
		editing: false,
		text: `Todo Item ${i}`,
		id: `added-${i}`,
	});
}

export const load = () => {
	const root = document.getElementById("root");
	if (!root) {
		return;
	}

	const domRoot = new DOMRoot(root, initState, todoReducer, renderTodoApp);
	domRoot.initialize();

	const { dispatch } = domRoot;
	const locationHashChanged = () => {
		if (location.hash === "#/active") {
			dispatch({
				type: TodoActionType.SetViewFilter,
				viewFilter: ViewFilter.Active,
			});
		} else if (location.hash === "#/completed") {
			dispatch({
				type: TodoActionType.SetViewFilter,
				viewFilter: ViewFilter.Completed,
			});
		}
	};
	window.addEventListener("hashchange", locationHashChanged);
	locationHashChanged();
};

if (globalThis.document) {
	load();
}
