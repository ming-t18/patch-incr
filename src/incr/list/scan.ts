import { applyPatches, replacePatch } from "../patch";
import type { IF } from "../types";
import { forwardScanPatches } from "./forwardList";

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
	// TODO simplify replace-into-self
	const fsp = forwardScanPatches(invokeScan);
	return {
		invoke: invokeScan,
		forward: (xs, dxs, ys) =>
			fsp(xs, dxs, ys) ?? replacePatch(invokeScan(applyPatches(xs, dxs))),
	};
};
