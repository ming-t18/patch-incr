import { type Draft, produce } from "immer";
import { fromReducerOnDraft } from "./incr/reducer";

export enum TodoActionType {
	Clear = "Clear",
	Add = "Add",
	SetDone = "SetDone",
	Remove = "Remove",
	StartEditing = "StartEditing",
	StopEditing = "StopEditing",
	EditText = "EditText",
}

export interface TodoActionClear {
	type: TodoActionType.Clear;
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

export type TodoAction =
	| TodoActionClear
	| TodoActionAdd
	| TodoActionSetDone
	| TodoActionRemove
	| TodoActionStartEditing
	| TodoActionStopEditing
	| TodoActionEditText;

export interface TodoItem {
	id: string;
	done: boolean;
	text: string;
}

export interface TodoState {
	counter: number;
	items: TodoItem[];
	editingId?: string | null;
}

const genId = (counter: number) => `id-${counter}`;

const findById = (items: TodoItem[], id0: string): number =>
	items.findIndex(({ id }) => id === id0);

export const getEditingIndexById = (state: TodoState, id: string): number =>
	findById(state.items, id);

export const todoStateReducerOnDraft = (
	draft: Draft<TodoState>,
	action: TodoAction,
) => {
	switch (action.type) {
		case TodoActionType.Clear: {
			draft.editingId = null;
			draft.items = [];
			return;
		}
		case TodoActionType.Add: {
			draft.items.push({
				done: false,
				text: action.value,
				id: genId(draft.counter),
			});
			draft.counter += 1;
			return;
		}
		case TodoActionType.SetDone: {
			const index = findById(draft.items, action.id);
			if (index !== -1) {
				draft.items[index].done = action.done;
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
			draft.editingId = action.id;
			return;
		}
		case TodoActionType.StopEditing: {
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

			draft.items[index].text = action.value;
			return;
		}
		default: {
			// @ts-expect-error action should be type never
			throw new Error(`Unsupported action: ${action.type}`);
		}
	}
};

export const todoReducer = fromReducerOnDraft(todoStateReducerOnDraft);

export const todoReducerFunc = produce(todoStateReducerOnDraft);
