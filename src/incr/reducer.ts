import { type Draft, enablePatches, produce, produceWithPatches } from "immer";
import type { Patches } from "./patch";
import type { IF } from "./types";
enablePatches();

export const fromReducerOnDraft = <State, Action>(
	funcOnDraft: (draft: Draft<State>, action: Action) => void,
): IF<State, State, Action, Patches> => {
	return {
		invoke: (state: State) => state,
		forward: (state, action, _ignored) => {
			const [_, patches] = produceWithPatches(state, (draft) => {
				funcOnDraft(draft, action);
			});
			return patches as never[] as Patches;
		},
	};
};
