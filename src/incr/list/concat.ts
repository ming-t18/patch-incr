import {
	CannotReduce,
	type PatchEntry,
	PatchOp,
	type Patches,
	liftPatch,
	reducePatches,
	reduceReplaceRoot,
	replacePatch,
} from "../patch";
import type { IF } from "../types";
import { scan } from "./scan";

export const concat = <T>(): IF<T[][], [T[], number[]]> => {
	const csum = scan((acc: number, { length }: T[]) => acc + length, 0);
	const invokeCombine = (xs: T[][]): T[] => {
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

	const invokeConcat = (xss: T[][]): [T[], number[]] => [
		invokeCombine(xss),
		csum.invoke(xss),
	];

	const forwardConcat = reducePatches(
		invokeConcat,
		(
			xs1: T[][],
			entry0: PatchEntry<T[][]>,
			[_ys, cys]: [T[], number[]],
		): Patches<[T[], number[]]> | CannotReduce => {
			if (xs1.length === 0) {
				return CannotReduce;
			}

			const entry = entry0; //normalizeArrayEntry(xs1, entry0);
			if (entry === null) {
				return CannotReduce;
			}
			const path = entry.path;
			if (path.length === 0) {
				return CannotReduce;
			}

			const index = path[0];
			if (typeof index !== "number") {
				return CannotReduce;
			}
			const indexMapped = index === 0 ? 0 : cys[index - 1];
			let listPatches: Patches<T[]> | null = null;
			if (entry.path.length > 1) {
				// TODO broken here
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
			} else if (entry.op === PatchOp.Remove) {
				const n = (xs1[index] as T[]).length;
				listPatches = Array(n)
					.fill(null)
					.map(() => ({
						op: PatchOp.Remove,
						path: [indexMapped],
					})) as Patches<T[]>;
			} else if (entry.op === PatchOp.Add) {
				listPatches = [...entry.value].reverse().map((value: T) => ({
					op: PatchOp.Add,
					path: [indexMapped],
					value,
				})) as Patches<T[]>;
			} else if (entry.op === PatchOp.Replace) {
				const n = (xs1[index] as T[]).length;
				listPatches = [
					...Array(n)
						.fill(null)
						.map(() => ({
							op: PatchOp.Remove,
							path: [indexMapped],
						})),
					...[...entry.value].reverse().map((value) => ({
						op: PatchOp.Add,
						path: [indexMapped],
						value,
					})),
				] as Patches<T[]>;
			}

			if (listPatches === null) {
				return CannotReduce;
			}
			const csumPatches = csum.forward(xs1, [entry0], cys);
			return [
				...liftPatch<[T[], number[]]>(0, listPatches),
				...liftPatch<[T[], number[]]>(1, csumPatches),
			];
		},
	);

	return {
		invoke: invokeConcat,
		forward: (xs, dxs, p) => {
			const res = reduceReplaceRoot(dxs);
			if ("replace" in res) {
				return replacePatch(invokeConcat(res.replace));
			}

			return forwardConcat(xs, dxs, p);
		},
	};
};
