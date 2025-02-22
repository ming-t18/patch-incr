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
	index: number;
	done: boolean;
}

export interface TodoActionRemove {
	type: TodoActionType.Remove;
	index: number;
}

export interface TodoActionStartEditing {
	type: TodoActionType.StartEditing;
	index: number;
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

export interface TodoState {
	items: { done: boolean; text: string }[];
	editingIndex?: number | null;
}

export const todoStateReducerOnDraft = (
	draft: Draft<TodoState>,
	action: TodoAction,
) => {
	switch (action.type) {
		case TodoActionType.Clear: {
			draft.editingIndex = null;
			draft.items = [];
			return;
		}
		case TodoActionType.Add: {
			draft.items.push({ done: false, text: action.value });
			return;
		}
		case TodoActionType.SetDone: {
			draft.items[action.index].done = action.done;
			return;
		}
		case TodoActionType.Remove: {
			draft.items.splice(action.index, 1);
			if (
				typeof draft.editingIndex === "number" &&
				draft.editingIndex >= draft.items.length
			) {
				draft.editingIndex = null;
			}
			return;
		}
		case TodoActionType.StartEditing: {
			draft.editingIndex = action.index;
			return;
		}
		case TodoActionType.StopEditing: {
			return;
		}
		case TodoActionType.EditText: {
			if (typeof draft.editingIndex !== "number") {
				return;
			}
			draft.items[draft.editingIndex].text = action.value;
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
