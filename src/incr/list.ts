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

export const concat = <T>(): IF<T[][], [number[], T[]]> => {
	const invokeConcat = (xs: T[][]): [number[], T[]] => {
		const lens: number[] = [];
		const combined: T[] = [];
		for (let i = 0; i < xs.length; i++) {
			combined.push(...xs[i]);
			lens.push(xs[i].length);
		}
		return [lens, combined];
	};
	return {
		invoke: invokeConcat,
		forward: reducePatches(invokeConcat, (input, entry, output) => {
			return CannotReduce;
		}),
	};
};
