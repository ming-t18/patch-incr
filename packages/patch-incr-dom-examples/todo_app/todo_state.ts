import type { ReducerIF } from "patch-incr/reducer";
import { fromReducerOnDraft } from "patcher/src/reducer";

export type { ReducerIF } from "patch-incr/reducer";

export enum ViewFilter {
	All = "All",
	Active = "Active",
	Completed = "Completed",
}

export enum TodoActionType {
	Clear = "Clear",
	ClearCompleted = "ClearCompleted",
	ToggleAll = "ToggleAll",
	Add = "Add",
	SetDone = "SetDone",
	Remove = "Remove",
	StartEditing = "StartEditing",
	StopEditing = "StopEditing",
	EditText = "EditText",
	SetViewFilter = "SetViewFilter",
}

export interface TodoActionClear {
	type: TodoActionType.Clear;
}

export interface TodoActionClearCompleted {
	type: TodoActionType.ClearCompleted;
}

export interface TodoActionToggleAll {
	type: TodoActionType.ToggleAll;
}

export interface TodoActionAdd {
	type: TodoActionType.Add;
	value: string;
}

export interface TodoActionSetDone {
	type: TodoActionType.SetDone;
	id: string;
	done: boolean;
}

export interface TodoActionRemove {
	type: TodoActionType.Remove;
	id: string;
}

export interface TodoActionStartEditing {
	type: TodoActionType.StartEditing;
	id: string;
}

export interface TodoActionStopEditing {
	type: TodoActionType.StopEditing;
}

export interface TodoActionEditText {
	type: TodoActionType.EditText;
	value: string;
}

export interface TodoActionSetViewFilter {
	type: TodoActionType.SetViewFilter;
	viewFilter: ViewFilter;
}

export type TodoAction =
	| TodoActionClear
	| TodoActionClearCompleted
	| TodoActionToggleAll
	| TodoActionAdd
	| TodoActionSetDone
	| TodoActionRemove
	| TodoActionStartEditing
	| TodoActionStopEditing
	| TodoActionEditText
	| TodoActionSetViewFilter;

export interface TodoItem {
	id: string;
	done: boolean;
	editing: boolean;
	text: string;
}

export interface TodoState {
	counter: number;
	items: TodoItem[];
	editingId?: string | null;
	viewFilter: ViewFilter;
}

const genId = (counter: number) => `id-${counter}`;

export const findById = (items: TodoItem[], id0: string): number =>
	items.findIndex(({ id }) => id === id0);

export const getEditingIndexById = (state: TodoState, id: string): number =>
	findById(state.items, id);

export const todoStateReducerOnDraft = (
	draft: TodoState,
	action: TodoAction,
) => {
	switch (action.type) {
		case TodoActionType.Clear: {
			draft.editingId = null;
			draft.items = [];
			return;
		}
		case TodoActionType.ClearCompleted: {
			draft.editingId = null;
			for (let i = draft.items.length - 1; i >= 0; i--) {
				if (draft.items[i]?.done) {
					draft.items.splice(i, 1);
				}
			}

			return;
		}
		case TodoActionType.ToggleAll: {
			const target = !draft.items.every((i) => i.done);
			for (let i = 0; i < draft.items.length; i++) {
				draft.items[i]!.done = target;
			}
			return;
		}
		case TodoActionType.Add: {
			draft.items.push({
				done: false,
				text: action.value,
				id: genId(draft.counter),
				editing: false,
			});
			draft.counter += 1;
			return;
		}
		case TodoActionType.SetDone: {
			const index = findById(draft.items, action.id);
			if (index !== -1) {
				draft.items[index]!.done = action.done;
			}
			return;
		}
		case TodoActionType.Remove: {
			const index = findById(draft.items, action.id);
			if (index === -1) {
				return;
			}

			draft.items.splice(index, 1);
			if (
				typeof draft.editingId === "string" &&
				draft.editingId === action.id
			) {
				draft.editingId = null;
			}
			return;
		}
		case TodoActionType.StartEditing: {
			const { id } = action;
			draft.editingId = id;
			for (const item of draft.items) {
				item.editing = item.id === id;
			}
			return;
		}
		case TodoActionType.StopEditing: {
			draft.editingId = null;
			for (const item of draft.items) {
				item.editing = false;
			}
			return;
		}
		case TodoActionType.EditText: {
			if (typeof draft.editingId !== "string") {
				return;
			}

			const index = findById(draft.items, draft.editingId);
			if (index === -1) {
				return;
			}

			draft.items[index]!.text = action.value;
			return;
		}
		case TodoActionType.SetViewFilter: {
			draft.viewFilter = action.viewFilter;
			return;
		}
		default: {
			// @ts-expect-error action should be type never
			throw new Error(`Unsupported action: ${action.type}`);
		}
	}
};

export const todoReducer: ReducerIF<TodoState, TodoAction> = fromReducerOnDraft(
	todoStateReducerOnDraft,
);
