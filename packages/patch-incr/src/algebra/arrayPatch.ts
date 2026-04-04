import { CannotReduce, liftPatches, PatchOp } from "@/patch";
import * as ps from "@/patchSchema";
import type { IndexEnd } from "@/patchSchema/types";
import type {
	Evaluate,
	ForwardHasOutput,
	ForwardNoOutput,
	PatchEntry,
	Patches,
} from "@/types";
import { getReplaceOnly, isReplaceOnly } from "./replaceOnly";

export interface ArrayPatchReducer<
	T,
	R extends unknown[],
	DT = Patches<T>,
	DR = R,
> {
	apply(index: number, change: DT, ...r: R): DR | CannotReduce;
	add(index: number | IndexEnd, value: T, ...r: R): DR | CannotReduce;
	replace(index: number, value: T, ...r: R): DR | CannotReduce;
	remove(index: number | IndexEnd, ...r: R): DR | CannotReduce;
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
