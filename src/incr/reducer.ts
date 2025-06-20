import { type Draft, enablePatches, produce, produceWithPatches } from "immer";
import type { ApplyCombine, DRO } from "../algebra";
import {
	maybeCombineDRO as combineDROUnion,
	getDRO,
	getReplaceOnly,
	isReplaceOnly,
	makeReplaceOnly,
} from "../algebra/replaceOnly";
import type { Patches } from "./patch";
import type { IF, NoForwardOutput } from "./types";

enablePatches();

export const fromReducerOnDraft = <State, Action>(
	funcOnDraft: (draft: Draft<State>, action: Action) => void,
): IF<State, State, Action[], Patches, NoForwardOutput> => {
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

export const applyFromReducer = <State, Action>(
	funcOnDraft: (draft: Draft<State>, action: Action) => void,
): ApplyCombine<State, Action[] | DRO<State>> => {
	const apply = (state: State, change: Action[] | DRO<State>): State => {
		if (change === null || (Array.isArray(change) && change.length === 0)) {
			return state;
		}

		if (isReplaceOnly(change)) {
			return getReplaceOnly(change);
		}

		return produce(state, (draft) => {
			for (const action of change) {
				funcOnDraft(draft, action);
			}
		});
	};

	return {
		empty: null,
		apply,
		fromReplace: makeReplaceOnly,
		isEmpty: (xs) => xs === null || (Array.isArray(xs) && xs.length === 0),
		isReplace: getDRO,
		combine: (a, b) =>
			combineDROUnion<State, Action[] | DRO<State>>(
				a,
				b,
				(s, c) => makeReplaceOnly(apply(s, c)),
				(a1, b1) => [...a1, ...b1],
			),
	};
};
