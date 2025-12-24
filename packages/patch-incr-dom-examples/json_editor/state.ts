import { enablePatches, type Draft } from "immer";
import { type ReducerIF, fromReducerOnDraft } from "patch-incr/reducer";
enablePatches();

export interface EditorState {
  data: unknown;
  isExpandedMap: Map<string, string>;
}

export interface EditorAction {}

export const editorStateReducerOnDraft = (draft: Draft<EditorState>, _action: EditorAction): void => {

};

export const editorReducer: ReducerIF<EditorState, EditorAction> = fromReducerOnDraft(editorStateReducerOnDraft);
