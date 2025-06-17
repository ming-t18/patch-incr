import type { ChangeBuilder } from "../../algebra";
import * as ps from "../../patchSchema";
import { IndexEnd } from "../../patchSchema/types";
import {
	CannotReduce,
	type PatchEntry,
	PatchOp,
	type Patches,
	type Path,
	liftPatch,
	reducePatches,
	reduceReplaceRoot,
	replacePatch,
} from "../patch";
import type { IF } from "../types";
import { splice } from "./arrayPatchHelpers";
import { scan } from "./scan";

export const concat = <T>(): IF<T[][], [T[], number[]]> => {
	const elemSchema = ps.atomic<T>();
	const csumSchema = ps.array(ps.atomic<number>());
	const concatSchema = ps.array(elemSchema);
	const outSchema = ps.tuple(concatSchema, csumSchema);

	const csum = scan((acc: number, { length }: T[]) => acc + length, 0);
	const evaluateCombine = (xs: T[][]): T[] => {
		const combined: T[] = [];
		for (let i = 0; i < xs.length; i++) {
			const a = xs[i];
			const n = a.length;
			for (let j = 0; j < n; j++) {
				combined.push(a[j]);
			}
		}
		return combined;
	};

	const evaluateConcat = (xss: T[][]): [T[], number[]] => [
		evaluateCombine(xss),
		csum.evaluate(xss),
	];

	const forwardConcat = reducePatches(
		evaluateConcat,
		(
			xs1: T[][],
			entry0: PatchEntry<T[][]>,
			[_ys, cys]: [T[], number[]],
		): Patches<[T[], number[]]> | CannotReduce => {
			if (xs1.length === 0) {
				return CannotReduce;
			}

			const entry = entry0;
			if (entry === null) {
				return CannotReduce;
			}
			const path = entry.path;
			if (path.length === 0) {
				return CannotReduce;
			}

			const index = path[0] === IndexEnd ? xs1.length : (path[0] as number);
			const indexMapped = index === 0 ? 0 : cys[index - 1];
			let listPatches: Patches<T[]> | null = null;
			if (entry.path.length > 1) {
				const off = path[1];
				if (typeof off !== "number") {
					return CannotReduce;
				}
				const tail = path.slice(2);
				listPatches = [
					{
						...entry,
						path: [indexMapped + off, ...tail],
					},
				] as Patches<T[]>;
			} else {
				const builder: ChangeBuilder<Patches<T[]>> = concatSchema.builder();
				let toRemove = 0;
				if (entry.op === PatchOp.Remove || entry.op === PatchOp.Replace) {
					toRemove = (xs1[index] as T[]).length;
				}
				let toAdd: T[] = [];
				if (entry.op === PatchOp.Add || entry.op === PatchOp.Replace) {
					toAdd = entry.value;
				}
				builder.append(splice(indexMapped, toRemove, toAdd));
				listPatches = builder.build();
			}

			if (listPatches === null) {
				return CannotReduce;
			}
			const csumPatches = csum.forward(xs1, [entry0], cys);
			return outSchema.combine(
				outSchema.liftIndex(0, listPatches),
				outSchema.liftIndex(1, csumPatches),
			);
		},
	);

	return {
		evaluate: evaluateConcat,
		forward: (xs: T[][], dxs: Patches<T[][]>, p: [T[], number[]]) => {
			const res = reduceReplaceRoot(dxs);
			if ("replace" in res) {
				return replacePatch(evaluateConcat(res.replace));
			}

			return forwardConcat(xs, dxs, p);
		},
	};
};
