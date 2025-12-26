import { type Draft, enablePatches } from "immer";
import { fromReducerOnDraft, type ReducerIF } from "patch-incr/reducer";

enablePatches();

export interface EditorState {
	data: unknown;
	isExpandedMap: Map<string, string>;
}

export type EditorAction = {};

export const editorStateReducerOnDraft = (
	_draft: Draft<EditorState>,
	_action: EditorAction,
): void => {};

export const editorReducer: ReducerIF<EditorState, EditorAction> =
	fromReducerOnDraft(editorStateReducerOnDraft);
