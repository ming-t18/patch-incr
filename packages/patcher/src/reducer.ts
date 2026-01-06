import type { Patches } from "patch-incr/patch";
import type { ReducerIF } from "patch-incr/reducer";
import { produceWithPatches } from "./produce";

export const fromReducerOnDraft = <State, Action>(
	funcOnDraft: (draft: State, action: Action) => void,
): ReducerIF<State, Action> => {
	return {
		evaluate: (state: State) => state,
		forward: (state: State, actions: Action[], _ignored?: State) => {
			const [_, patches] = produceWithPatches(state, (draft) => {
				for (const action of actions) {
					funcOnDraft(draft, action);
				}
			});
			return patches as never[] as Patches;
		},
	};
};
