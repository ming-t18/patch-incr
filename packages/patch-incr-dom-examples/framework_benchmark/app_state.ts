import {
    PatchBuilder,
	type Patches,
	PatchOp,
	removePatch,
	replacePatch,
} from "patch-incr/patch";
import {
	fromReducerReturningPatches,
	type ReducerIF,
} from "patch-incr/reducer";

export interface Item {
	id: number;
	label: string;
}

export interface AppState {
	data: Item[];
	selected: number;
}

export enum ActionType {
	RUN = "RUN",
	RUN_LOTS = "RUN_LOTS",
	ADD = "ADD",
	UPDATE = "UPDATE",
	CLEAR = "CLEAR",
	SWAP_ROWS = "SWAP_ROWS",
	REMOVE = "REMOVE",
	SELECT = "SELECT",
}

export type RunAction = { type: ActionType.RUN };
export type RunLotsAction = { type: ActionType.RUN_LOTS };
export type AddAction = { type: ActionType.ADD };
export type UpdateAction = { type: ActionType.UPDATE };
export type ClearAction = { type: ActionType.CLEAR };
export type SwapRowsAction = { type: ActionType.SWAP_ROWS };
export type RemoveAction = { type: ActionType.REMOVE; id: number };
export type SelectAction = { type: ActionType.SELECT; id: number };

export type AppAction =
	| RunAction
	| RunLotsAction
	| AddAction
	| UpdateAction
	| ClearAction
	| SwapRowsAction
	| RemoveAction
	| SelectAction;

const random = (max: number) => Math.round(Math.random() * 1000) % max;

const A = [
	"pretty",
	"large",
	"big",
	"small",
	"tall",
	"short",
	"long",
	"handsome",
	"plain",
	"quaint",
	"clean",
	"elegant",
	"easy",
	"angry",
	"crazy",
	"helpful",
	"mushy",
	"odd",
	"unsightly",
	"adorable",
	"important",
	"inexpensive",
	"cheap",
	"expensive",
	"fancy",
];
const C = [
	"red",
	"yellow",
	"blue",
	"green",
	"pink",
	"brown",
	"purple",
	"brown",
	"white",
	"black",
	"orange",
];
const N = [
	"table",
	"chair",
	"house",
	"bbq",
	"desk",
	"car",
	"pony",
	"cookie",
	"sandwich",
	"burger",
	"pizza",
	"mouse",
	"keyboard",
];

let nextId = 1;

const buildData = (count: number): Item[] => {
	const data: Item[] = new Array(count);

	for (let i = 0; i < count; i++) {
		data[i] = {
			id: nextId++,
			label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}`,
		};
	}

	return data;
};

// The reducer
export const getPatchesOnAppState = (
	state: AppState,
	action: AppAction,
): Patches<AppState> => {
	const { data } = state;
	const patches = PatchBuilder.empty<AppState>();
	switch (action.type) {
		case ActionType.RUN:
			return replacePatch({ data: buildData(1000), selected: 0 });
		case ActionType.RUN_LOTS:
			return replacePatch({ data: buildData(10000), selected: 0 });
		case ActionType.ADD: {
			for (const value of buildData(1000)) {
				patches.add(["data", "-"], value);
			}

			return patches.build();
		}
		case ActionType.UPDATE: {
			for (let i = 0; i < data.length; i += 10) {
				patches.replace(["data", i, "label"], `${data[i]!.label} !!!`);
			}
			return patches.build();
		}
		case ActionType.CLEAR:
			return replacePatch({ data: [], selected: 0 } as AppState);
		case ActionType.SWAP_ROWS: {
			if (data.length <= 998) {
				return patches.build();
			}

      return patches
        .replace(["data", 1], data[998])
        .replace(["data", 998], data[1])
  			.build();
		}
		case ActionType.REMOVE: {
			const idx = data.findIndex((d) => d.id === action.id);
			return removePatch(["data", idx]);
		}
		case ActionType.SELECT: {
			return replacePatch(action.id, ["selected"]);
		}
	}

	return patches.build();
};

export const initState: AppState = { data: [], selected: 0 };

export const appReducer: ReducerIF<AppState, AppAction> =
	fromReducerReturningPatches(getPatchesOnAppState);
