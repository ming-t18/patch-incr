import { applyPatches } from "../patch";
import {
	CannotReduce,
	type PatchEntry,
	PatchOp,
	type Patches,
	liftPatch,
	normalizeArrayEntry,
	reducePatches,
	reduceReplaceRoot,
	replacePatch,
	unliftPatch,
} from "../patch";
import type { IF } from "../types";
import { scan } from "./scan";

const forwardFilterInternal = <T>(
	pred: (value: T) => boolean,
	entry: PatchEntry<T[]>,
	xs: T[],
	index: number,
	index1: number,
) => {
	// internal change
	const value = xs[index];
	const valueUpdated = applyPatches(value, unliftPatch(index, [entry]));
	const prev = pred(value);
	const next = pred(valueUpdated);
	if (!prev && !next) {
		return [];
	}
	if (prev && next) {
		return [
			{
				...entry,
				path: [index1, ...entry.path.slice(1)],
			},
		] as Patches<never>;
	}
	if (prev && !next) {
		return [
			{
				op: PatchOp.Remove,
				path: [index1],
			},
		] as Patches<never>;
	}

	// !prev && next
	return [
		{
			op: PatchOp.Add,
			path: [index1],
			value: valueUpdated,
		},
	] as Patches<never>;
};

const forwardFilterSingleListOp = <T>(
	pred: (value: T) => boolean,
	entry: PatchEntry<T[]>,
	xs: T[],
	index: number,
	index1: number,
): Patches<T[]> => {
	const { op } = entry;
	if (op === PatchOp.Add) {
		if (!pred(entry.value)) {
			return [];
		}
	} else if (op === PatchOp.Remove) {
		if (!pred(xs[index])) {
			return [];
		}
	} else if (op === PatchOp.Replace) {
		const prev = pred(xs[index]);
		const next = pred(entry.value);
		if (prev !== next) {
			return [
				{
					op: next ? PatchOp.Add : PatchOp.Remove,
					path: [index1],
					value: entry.value,
				},
			] as Patches<never>;
		}
		if (!prev) {
			return [];
		}
	}
	return [
		{
			...entry,
			path: [index1],
		},
	] as Patches<never>;
};

const forwardFilterPatchEntry = <T>(
	pred: (value: T) => boolean,
	csum: IF<T[], number[]>,
	xs: T[],
	entry0: PatchEntry<T[]>,
	cys: number[],
): Patches<[T[], number[]]> | CannotReduce => {
	if (entry0.path.length === 0) {
		throw new Error("replace root should not be there");
	}
	const entry = normalizeArrayEntry(xs, entry0);
	if (entry === null) {
		return CannotReduce;
	}

	const index = entry.path[0];
	const index1 = index === 0 ? 0 : cys[index - 1];

	const csumPatches: Patches<number[]> = csum.forward(xs, [entry], cys);
	const listPatches: Patches<T[]> =
		entry.path.length > 1
			? forwardFilterInternal(pred, entry, xs, index, index1)
			: forwardFilterSingleListOp(pred, entry, xs, index, index1);

	return [
		...liftPatch<[T[], number[]]>(0, listPatches),
		...liftPatch<[T[], number[]]>(1, csumPatches),
	];
};

export const filter = <T>(
	pred: (value: T) => boolean,
): IF<T[], [T[], number[]]> => {
	const csum = scan(
		(acc: number, value: T) => (pred(value) ? acc + 1 : acc),
		0,
	);

	const evaluateFilter = (xs: T[]): [T[], number[]] => [
		xs.filter(pred),
		csum.evaluate(xs),
	];

	const forward1 = reducePatches(
		evaluateFilter,
		(xs1: T[], entry, [_ys1, cys1]: [T[], number[]]) =>
			forwardFilterPatchEntry(pred, csum, xs1, entry, cys1),
	);

	return {
		evaluate: evaluateFilter,
		forward: (
			xs: T[],
			dxs: Patches<T[]>,
			[ys, cys]: [T[], number[]],
		): Patches<[T[], number[]]> => {
			const res = reduceReplaceRoot(dxs);
			if ("replace" in res) {
				return replacePatch(evaluateFilter(res.replace));
			}

			return forward1(xs, dxs, [ys, cys]);
		},
	};
};
