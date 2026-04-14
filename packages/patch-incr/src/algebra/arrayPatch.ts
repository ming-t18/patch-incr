import {
	addPatches,
	CannotReduce,
	liftPatches,
	PatchOp,
	removePatches,
	replacePatches,
} from "@/patch";
import * as ps from "@/patchSchema";
import type { IndexEnd, PatchSchemaArrayEntry } from "@/patchSchema/types";
import type {
	Evaluate,
	ForwardHasOutput,
	ForwardNoOutput,
	PatchEntry,
	Patches,
} from "@/types";
import { getReplaceOnly, isReplaceOnly } from "./replaceOnly";

/**
 * An `ArrayPatchReducer` handles the `forward` function
 * of incremental functions on arrays, `IF<T[], Y>`.
 *
 */
export interface ArrayPatchReducer<
	T,
	Args extends unknown[] = [],
	DT = PatchEntry<T>,
	Return = void,
> {
	apply(index: number, change: DT, ...args: Args): Return | CannotReduce;
	add(index: number | IndexEnd, value: T, ...args: Args): Return | CannotReduce;
	replace(index: number, value: T, ...args: Args): Return | CannotReduce;
	remove(index: number | IndexEnd, ...args: Args): Return | CannotReduce;
}

export type ArrayPatchReducer0<
	X,
	Y,
	DX = Patches<X>,
	DY = Patches<Y>,
> = ArrayPatchReducer<X, [], DX, DY>;

export type ArrayPatchReducer1<
	X,
	Y,
	DX = Patches<X>,
	DY = Patches<Y>,
> = ArrayPatchReducer<X, [xsCurr: X[]], DX, DY>;

export type ArrayPatchReducer2<
	X,
	Y,
	DX = Patches<X>,
	DY = Patches<Y>,
> = ArrayPatchReducer<X, [xsCurr: X[], yCurr: Y], DX, DY>;

/**
 * Creates the PatchReducer for an `IF<T[], T[]>`
 * that remaps the index (examples: slice, reverse, sort).
 */
export const makeIndexRemappingReducer = <T>(
	remapper: (
		index: number | IndexEnd,
		arr: T[],
	) => number | null | CannotReduce,
): ArrayPatchReducer<T, [T[]], PatchEntry<T>, Patches<T[]>> => ({
	apply: (
		index: number,
		change: PatchEntry<T>,
		arr: T[],
	): typeof CannotReduce | Patches<T[]> => {
		const index1 = remapper(index, arr);
		if (index1 === CannotReduce) {
			return CannotReduce;
		}
		if (index1 === null) {
			return [];
		}
		return liftPatches(index1, [change]);
	},
	add: (
		index: number | IndexEnd,
		value: T,
		arr: T[],
	): typeof CannotReduce | Patches<T[]> => {
		const index1 = remapper(index, arr);
		if (index1 === CannotReduce) {
			return CannotReduce;
		}
		if (index1 === null) {
			return [];
		}
		return addPatches(value, [index1]);
	},
	replace: (
		index: number,
		value: T,
		arr: T[],
	): typeof CannotReduce | Patches<T[]> => {
		const index1 = remapper(index, arr);
		if (index1 === CannotReduce) {
			return CannotReduce;
		}
		if (index1 === null) {
			return [];
		}
		return replacePatches(value, [index1]);
	},
	remove: (
		index: number | IndexEnd,
		arr: T[],
	): typeof CannotReduce | Patches<T[]> => {
		const index1 = remapper(index, arr);
		if (index1 === CannotReduce) {
			return CannotReduce;
		}
		if (index1 === null) {
			return [];
		}
		return removePatches([index1]);
	},
});

export const reduceArrayPatches0 = <X, Y>(
	reducer: ArrayPatchReducer0<X, Y>,
	evaluate: Evaluate<X[], Y>,
): ForwardNoOutput<X[], Y> => {
	const xsSchema = ps.array(ps.atomic<X>());
	const ysSchema = ps.atomic<Y>();
	return (xs: X[], dxs: Patches<X[]>, _?: Y): Patches<Y> => {
		const res = xsSchema.analyze(dxs);
		if (res === null) {
			return ysSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return ysSchema.fromReplace(evaluate(getReplaceOnly(res)));
		}

		let out: Patches<Y> = ysSchema.empty;
		for (const entry of res) {
			let dy: Patches<Y> | CannotReduce;
			if ("inner" in entry) {
				const index = entry.path[0];
				dy = reducer.apply(index, [entry.inner]);
				continue;
			} else if (entry.op === PatchOp.Add) {
				const index = entry.path[0];
				dy = reducer.add(index, entry.value);
			} else if (entry.op === PatchOp.Remove) {
				const index = entry.path[0];
				dy = reducer.remove(index);
			} else if (entry.op === PatchOp.Replace) {
				const index = entry.path[0];
				dy = reducer.replace(index, entry.value);
			} else {
				throw new Error("invalid entry.op");
			}
			if (dy === CannotReduce) {
				return ysSchema.fromReplace(evaluate(xsSchema.apply(xs, dxs)));
			}
			out = ysSchema.combine(out, dy);
		}

		return out;
	};
};

export const reduceArrayPatches1 = <X, Y>(
	reducer: ArrayPatchReducer1<X, Y>,
	evaluate: Evaluate<X[], Y>,
): ForwardNoOutput<X[], Y> => {
	const xsSchema = ps.array(ps.atomic<X>());
	const ysSchema = ps.atomic<Y>();
	return (xs: X[], dxs: Patches<X[]>, _?: Y): Patches<Y> => {
		const res = xsSchema.analyze(dxs);
		if (res === null) {
			return ysSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return ysSchema.fromReplace(evaluate(getReplaceOnly(res)));
		}

		let xs1: X[] = xs;
		let out: Patches<Y> = ysSchema.empty;
		for (const entry of res) {
			let dy: Patches<Y> | CannotReduce;
			if ("inner" in entry) {
				const index = entry.path[0];
				dy = reducer.apply(index, [entry.inner], xs1);
				continue;
			} else if (entry.op === PatchOp.Add) {
				const index = entry.path[0];
				dy = reducer.add(index, entry.value, xs1);
			} else if (entry.op === PatchOp.Remove) {
				const index = entry.path[0];
				dy = reducer.remove(index, xs1);
			} else if (entry.op === PatchOp.Replace) {
				const index = entry.path[0];
				dy = reducer.replace(index, entry.value, xs1);
			} else {
				throw new Error("invalid entry.op");
			}
			if (dy === CannotReduce) {
				return ysSchema.fromReplace(evaluate(xsSchema.apply(xs, dxs)));
			}

			xs1 = xsSchema.apply(
				xs1,
				"inner" in entry
					? liftPatches(entry.path[0], [entry.inner as PatchEntry<X>])
					: [entry],
			);
			out = ysSchema.combine(out, dy);
		}

		return out;
	};
};

export const reduceArrayPatches2 = <X, Y>(
	reducer: ArrayPatchReducer2<X, Y>,
	evaluate: Evaluate<X[], Y>,
): ForwardHasOutput<X[], Y> => {
	const xsSchema = ps.array(ps.atomic<X>());
	const ysSchema = ps.atomic<Y>();
	return (xs: X[], dxs: Patches<X[]>, y: Y): Patches<Y> => {
		const res = xsSchema.analyze(dxs);
		if (res === null) {
			return ysSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return ysSchema.fromReplace(evaluate(getReplaceOnly(res)));
		}

		let xs1: X[] = xs;
		let y1: Y = y;
		let out: Patches<Y> = ysSchema.empty;
		for (const entry of res) {
			let dy: Patches<Y> | CannotReduce;
			if ("inner" in entry) {
				const index = entry.path[0];
				dy = reducer.apply(index, [entry.inner], xs1, y1);
			} else if (entry.op === PatchOp.Add) {
				const index = entry.path[0];
				dy = reducer.add(index, entry.value, xs1, y1);
			} else if (entry.op === PatchOp.Remove) {
				const index = entry.path[0];
				dy = reducer.remove(index, xs1, y1);
			} else if (entry.op === PatchOp.Replace) {
				const index = entry.path[0];
				dy = reducer.replace(index, entry.value, xs1, y1);
			} else {
				throw new Error("invalid entry.op");
			}
			if (dy === CannotReduce) {
				return ysSchema.fromReplace(evaluate(xsSchema.apply(xs, dxs)));
			}

			xs1 = xsSchema.apply(
				xs1,
				"inner" in entry
					? xsSchema.liftIndex(entry.path[0] as number, [entry.inner])
					: [entry],
			);
			y1 = ysSchema.apply(y1, dy);
			out = ysSchema.combine(out, dy);
		}

		return out;
	};
};

export const reduceArrayPatchesGeneric = <
	X,
	Y,
	Args extends unknown[],
	State,
	Ret = State,
>({
	reducer,
	evaluate,
	stateToArgs,
	getInitial,
	stateReducer,
}: {
	reducer: ArrayPatchReducer<X, Args, PatchEntry<X>, Ret>;
	evaluate: Evaluate<X[], Y>;
	stateToArgs: (entry: PatchSchemaArrayEntry<X>, state: State) => Args;
	getInitial: (input: X[], dxs: Patches<X[]>, output: Y) => State;
	stateReducer: (
		state: State,
		entry: PatchSchemaArrayEntry<X>,
		ret: Ret,
	) => [Patches<Y>, State];
}): ForwardHasOutput<X[], Y> => {
	const xsSchema = ps.array(ps.atomic<X>());
	const ysSchema = ps.atomic<Y>();
	return (xs: X[], dxs: Patches<X[]>, y: Y): Patches<Y> => {
		const res = xsSchema.analyze(dxs);
		if (res === null) {
			return ysSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return ysSchema.fromReplace(evaluate(getReplaceOnly(res)));
		}

		let state: State = getInitial(xs, dxs, y);
		let out: Patches<Y> = ysSchema.empty;
		for (const entry of res) {
			let r: Ret | CannotReduce;
			const args = stateToArgs(entry, state);
			if ("inner" in entry) {
				const index = entry.path[0];
				r = reducer.apply(index, entry.inner, ...args);
			} else if (entry.op === PatchOp.Add) {
				const index = entry.path[0];
				r = reducer.add(index, entry.value, ...args);
			} else if (entry.op === PatchOp.Remove) {
				const index = entry.path[0];
				r = reducer.remove(index, ...args);
			} else if (entry.op === PatchOp.Replace) {
				const index = entry.path[0];
				r = reducer.replace(index, entry.value, ...args);
			} else {
				throw new Error("invalid entry.op");
			}
			if (r === CannotReduce) {
				return ysSchema.fromReplace(evaluate(xsSchema.apply(xs, dxs)));
			}
			const [dy, state1] = stateReducer(state, entry, r);
			state = state1;
			out = ysSchema.combine(out, dy);
		}

		return out;
	};
};
