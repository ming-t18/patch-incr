import { getReplaceOnly, isReplaceOnly } from "@/algebra";
import {
	type PatchAdd,
	type PatchEntry,
	type Patches,
	PatchOp,
	type PatchRemove,
	type PatchReplace,
	type Path,
} from "@/patch";
import { analyzeDisplacement } from "@/patch/helpers";
import * as ps from "@/patchSchema";
import type { IF, NoForwardOutput } from "@/types";
import { composeMemo } from "../compose";
import { map } from "./map";

export const indexed = <T>(): IF<
	T[],
	[number, T][],
	Patches<T[]>,
	Patches<[number, T][]>,
	NoForwardOutput
> => {
	const inSchema = ps.array(ps.atomic<T>());
	const pairSchema = ps.tuple(ps.atomic<number>(), ps.atomic<T>());
	const outSchema = ps.array(pairSchema);
	const evaluateIndexed = (xs: T[]) => xs.map((x, i): [number, T] => [i, x]);
	const forwardIndexed = (
		xs: T[],
		dxs: Patches<T[]>,
		_?: [number, T][],
	): Patches<[number, T][]> => {
		const res = inSchema.analyze(dxs);
		if (res === null) {
			return outSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return outSchema.fromReplace(evaluateIndexed(getReplaceOnly(res)));
		}
		const xs1 = inSchema.apply(xs, dxs);
		const newLength = xs1.length;

		const dys: Patches<[number, T][]> = dxs.map((e) => {
			if (e.path.length > 1) {
				// inner change
				return {
					...e,
					path: [e.path[0], 1, ...e.path.slice(1)],
				} as PatchEntry;
			}

			if (e.op === PatchOp.Replace) {
				return {
					...e,
					path: [e.path[0], 1],
				} as PatchReplace<Path, [number, T][]>;
			}
			if (e.op === PatchOp.Add) {
				return {
					op: PatchOp.Add,
					path: [e.path[0]],
					// -1 will be replaced later on
					value: [-1, e.value],
				} as PatchAdd<Path, [number, T][]>;
			}
			return e satisfies PatchRemove;
		});

		const minIndex = analyzeDisplacement(dxs) ?? Math.min(xs.length, newLength);
		for (let i = minIndex; i < newLength; i++) {
			dys.push({
				op: PatchOp.Replace,
				path: [i, 0],
				value: i,
			});
		}
		return dys;
	};
	return {
		evaluate: evaluateIndexed,
		forward: forwardIndexed,
	};
};

export const mapIndexed = <Input, Output>(
	f: IF<[number, Input], Output>,
): IF<Input[], Output[]> => {
	return composeMemo(indexed(), map(f));
};
