import { makeReplaceOnly } from "../memo/replaceOnly";
import { forwardMapPatches, forwardScanPatches } from "./forwardList";
import {
	CannotReduce,
	type PatchEntry,
	PatchOp,
	type Patches,
	applyPatches,
	liftPatch,
	reducePatches,
	replacePatch,
	unliftPatch,
} from "./patch";
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

export const filter = <T>(
	pred: (value: T) => boolean,
): IF<T[], [T[], number[]]> => {
	const csum = scan(
		(acc: number, value: T) => (pred(value) ? acc + 1 : acc),
		0,
	);
	const invokeFilterLeft = (xs: T[]): T[] => {
		return xs.filter(pred);
	};
	const invokeFilter = (xs: T[]): [T[], number[]] => {
		return [xs.filter(pred), csum.invoke(xs)];
	};
	return {
		invoke: invokeFilter,
		forward: (xs, dxs, [ys, cys]) => {
			const csumPatches = csum.forward(xs, dxs, cys);
			const listPatches = reducePatches(
				invokeFilterLeft,
				(xs1, entry, _output) => {
					if (entry.path.length === 0) {
						return CannotReduce;
					}

					const index = entry.path[0];
					if (typeof index !== "number") {
						return CannotReduce;
					}
					const index1 = index === 0 ? 0 : cys[index - 1];

					if (entry.path.length > 1) {
						// internal change
						const value = xs1[index];
						const valueUpdated = applyPatches(
							value,
							unliftPatch(index, [entry]),
						);
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
					}

					const { op } = entry;
					if (op === PatchOp.Add) {
						if (!pred(entry.value)) {
							return [];
						}
					} else if (op === PatchOp.Remove) {
						if (!pred(xs1[index])) {
							return [];
						}
					} else if (op === PatchOp.Replace) {
						const prev = pred(xs1[index]);
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
				},
			)(xs, dxs, ys);
			return [
				...liftPatch<[T[], number[]]>(0, listPatches),
				...liftPatch<[T[], number[]]>(1, csumPatches),
			];
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
	return {
		invoke: invokeConcat,
		forward: (xs, dxs, [ys, cys]) => {
			const csumPatches = csum.forward(xs, dxs, cys);
			const listPatches = reducePatches(
				invokeCombine,
				(xs1, entry: PatchEntry<T[][]>, _output) => {
					if (xs1.length === 0) {
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
					if (entry.path.length > 1) {
						const off = path[index + 1];
						if (typeof off !== "number") {
							return CannotReduce;
						}
						const tail = path.slice(2);
						return [
							{
								...entry,
								path: [indexMapped + off, ...tail],
							},
						] as Patches<T[]>;
					}

					if (entry.op === PatchOp.Remove) {
						const n = (xs[index] as T[]).length;
						return Array(n)
							.fill(null)
							.map(() => ({
								op: PatchOp.Remove,
								path: [indexMapped],
							})) as Patches<T[]>;
					}

					if (entry.op === PatchOp.Add) {
						return [...entry.value].reverse().map((value: T) => ({
							op: PatchOp.Add,
							path: [indexMapped],
							value,
						})) as Patches<T[]>;
					}

					if (entry.op === PatchOp.Replace) {
						const n = (xs[index] as T[]).length;
						return [
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

					return CannotReduce;
				},
			)(xs, dxs, ys);
			return [
				...liftPatch<[T[], number[]]>(0, listPatches),
				...liftPatch<[T[], number[]]>(1, csumPatches),
			];
		},
	};
};
