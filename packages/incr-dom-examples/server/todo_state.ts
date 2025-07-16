import type { Draft } from "immer";
import { type Patches, PatchOp, replacePatch } from "incr/src/incr/patch";
import {
	fromReducerReturningPatches,
	type ReducerIF,
} from "incr/src/incr/reducer";
import { IndexEnd } from "incr/src/patchSchema/types";

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
	draft: Draft<TodoState>,
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
				if (draft.items[i].done) {
					draft.items.splice(i, 1);
				}
			}

			return;
		}
		case TodoActionType.ToggleAll: {
			const target = !draft.items.every((i) => i.done);
			for (let i = 0; i < draft.items.length; i++) {
				draft.items[i].done = target;
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

			draft.items[index].text = action.value;
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

export const getPatchesOnTodoState = (
	state: TodoState,
	action: TodoAction,
): Patches<TodoState> => {
	switch (action.type) {
		case TodoActionType.Clear: {
			return [
				{
					op: PatchOp.Replace,
					path: ["editingId"],
					value: null,
				},
				{
					op: PatchOp.Replace,
					path: ["items"],
					value: [],
				},
			];
		}
		case TodoActionType.ClearCompleted: {
			const patches: Patches<TodoState> = [
				{
					op: PatchOp.Replace,
					path: ["editingId"],
					value: null,
				},
			];
			for (let i = state.items.length - 1; i >= 0; i--) {
				if (state.items[i].done) {
					patches.push({
						op: PatchOp.Remove,
						path: ["items", i],
					});
				}
			}
			return patches;
		}
		case TodoActionType.ToggleAll: {
			return state.items.map(({ done }, i) => ({
				op: PatchOp.Replace,
				path: ["items", i],
				value: !done,
			}));
		}
		case TodoActionType.Add: {
			const newItem = {
				done: false,
				text: action.value,
				id: genId(state.counter),
				editing: false,
			};
			return [
				{
					op: PatchOp.Replace,
					path: ["counter"],
					value: state.counter + 1,
				},
				{
					op: PatchOp.Add,
					path: ["items", IndexEnd],
					value: newItem,
				},
			];
		}
		case TodoActionType.SetDone: {
			const index = findById(state.items, action.id);
			if (index !== -1) {
				return [
					{
						op: PatchOp.Replace,
						path: ["items", index, "done"],
						value: action.done,
					},
				];
			}
			return [];
		}
		case TodoActionType.Remove: {
			const index = findById(state.items, action.id);
			if (index === -1) {
				return [];
			}

			const patches: Patches<TodoState> = [
				{
					op: PatchOp.Remove,
					path: ["items", index],
				},
			];
			if (
				typeof state.editingId === "string" &&
				state.editingId === action.id
			) {
				patches.push({
					op: PatchOp.Replace,
					path: ["editingId"],
					value: null,
				});
			}
			return patches;
		}
		case TodoActionType.StartEditing: {
			const { id } = action;
			const patches: Patches<TodoState> = [
				{
					op: PatchOp.Replace,
					path: ["editingId"],
					value: id,
				},
			];
			for (let i = 0; i < state.items.length; i++) {
				const newValue = state.items[i].id === id;
				if (state.items[i].editing !== newValue) {
					patches.push({
						op: PatchOp.Replace,
						path: ["items", i, "editing"],
						value: newValue,
					});
				}
			}
			return patches;
		}
		case TodoActionType.StopEditing: {
			if (state.editingId === null) {
				return [];
			}

			const patches: Patches<TodoState> = [
				{
					op: PatchOp.Replace,
					path: ["editingId"],
					value: null,
				},
			];
			for (let i = 0; i < state.items.length; i++) {
				if (state.items[i].editing === true) {
					patches.push({
						op: PatchOp.Replace,
						path: ["items", i, "editing"],
						value: false,
					});
				}
			}
			return patches;
		}
		case TodoActionType.EditText: {
			if (typeof state.editingId !== "string") {
				return [];
			}

			const index = findById(state.items, state.editingId);
			if (index === -1) {
				return [];
			}

			return [
				{
					op: PatchOp.Replace,
					path: ["items", index, "text"],
					value: action.value,
				},
			];
		}
		case TodoActionType.SetViewFilter: {
			return replacePatch(action.viewFilter, ["viewFilter"]);
		}
		default: {
			// @ts-expect-error action should be type never
			throw new Error(`Unsupported action: ${action.type}`);
		}
	}
};

// enablePatches();
// export const todoReducer: ReducerIF<TodoState, TodoAction> = fromReducerOnDraft(todoStateReducerOnDraft);
export const todoReducer: ReducerIF<TodoState, TodoAction> =
	fromReducerReturningPatches(getPatchesOnTodoState);
