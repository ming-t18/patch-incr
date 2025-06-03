import { type Patches, applyPatches, replacePatch } from "../patch";
import type { IF } from "../types";
import { forwardScanPatches } from "./forwardList";

export const scan = <T, Acc>(
	func: (acc: Acc, value: T) => Acc,
	init: Acc,
): IF<T[], Acc[]> => {
	const evaluateScan = (xs: T[], init0 = init): Acc[] => {
		let acc = init0;
		const values: Acc[] = [];
		for (let i = 0; i < xs.length; i++) {
			acc = func(acc, xs[i]);
			values.push(acc);
		}
		return values;
	};
	// TODO simplify replace-into-self
	const fsp = forwardScanPatches(evaluateScan);
	return {
		evaluate: evaluateScan,
		forward: (xs: T[], dxs: Patches<T[]>, ys: Acc[]) =>
			fsp(xs, dxs, ys) ?? replacePatch(evaluateScan(applyPatches(xs, dxs))),
	};
};
