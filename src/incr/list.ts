import { composeNoInterm } from "./compose";
import { compose } from "./compose";
import { forwardMapPatches, forwardScanPatches } from "./forwardList";
import {
	CannotReduce,
	type PatchEntry,
	PatchOp,
	type Patches,
	applyPatches,
	liftPatch,
	normalizeArrayEntry,
	reducePatches,
	reduceReplaceRoot,
	replacePatch,
	unliftPatch,
} from "./patch";
import { assocRight } from "./tuple";
import type { IF } from "./types";

export const map = <Input, Output>(
	f: IF<Input, Output>,
): IF<Input[], Output[]> => {
	const invokeMap = (xs: Input[]) => xs.map((x) => f.invoke(x));
	const fmp = forwardMapPatches(f);
	return {
		invoke: invokeMap,
		forward: (xs, dxs, ys) =>
			fmp(xs, dxs, ys) ?? replacePatch(invokeMap(applyPatches(xs, dxs))),
	};
};

export const scan = <T, Acc>(
	func: (acc: Acc, value: T) => Acc,
	init: Acc,
): IF<T[], Acc[]> => {
	const invokeScan = (xs: T[], init0 = init): Acc[] => {
		let acc = init0;
		const values: Acc[] = [];
		for (let i = 0; i < xs.length; i++) {
			acc = func(acc, xs[i]);
			values.push(acc);
		}
		return values;
	};
	const fsp = forwardScanPatches(invokeScan);
	return {
		invoke: invokeScan,
		forward: (xs, dxs, ys) =>
			fsp(xs, dxs, ys) ?? replacePatch(invokeScan(applyPatches(xs, dxs))),
	};
};

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

const TEST = {
	value: [],
	patches: [
		{ op: "add", path: [0], value: { str: "", num: 0 } },
		{ op: "replace", path: [2], value: { str: "", num: 0 } },
	],
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

	const invokeFilter = (xs: T[]): [T[], number[]] => [
		xs.filter(pred),
		csum.invoke(xs),
	];

	const forward1 = reducePatches(
		invokeFilter,
		(xs1: T[], entry, [_ys1, cys1]: [T[], number[]]) =>
			forwardFilterPatchEntry(pred, csum, xs1, entry, cys1),
	);

	return {
		invoke: invokeFilter,
		forward: (xs, dxs, [ys, cys]) => {
			const res = reduceReplaceRoot(dxs);
			if ("replace" in res) {
				return replacePatch(invokeFilter(res.replace));
			}

			return forward1(xs, dxs, [ys, cys]);
		},
	};
};

export const concat = <T>(): IF<T[][], [T[], number[]]> => {
	const csum = scan((acc: number, { length }: T[]) => acc + length, 0);
	const invokeCombine = (xs: T[][]): T[] => {
		const combined: T[] = [];
		for (let i = 0; i < xs.length; i++) {
			combined.push(...xs[i]);
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

			const entry = normalizeArrayEntry(xs1, entry0);
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
				const off = path[index + 1];
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

export const flatMap = <Input, Output>(
	func: IF<Input, Output[]>,
): IF<Input[], [Output[], [number[], Output[][]]]> => {
	const composed = compose(map(func), concat());
	return composeNoInterm(composed, assocRight());
};
