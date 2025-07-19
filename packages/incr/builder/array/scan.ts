import { getReplaceOnly, isReplaceOnly } from "../../algebra/replaceOnly";
import type { Patches } from "../../patch";
import * as ps from "../../patchSchema";
import type { IF } from "../../types";
import { splice } from "./helpers/arrayPatch";
import { getMinUpdatedIndex } from "./helpers/forwardArray";

export const scan = <T, Acc>(
	func: (acc: Acc, value: T) => Acc,
	init: Acc,
): IF<T[], Acc[]> => {
	const elemSchema = ps.atomic<T>();
	const inSchema = ps.array(elemSchema);
	const accSchema = ps.atomic<Acc>();
	const outSchema = ps.array(accSchema);
	const evaluateScan = (xs: T[], init0 = init): Acc[] => {
		let acc = init0;
		const values: Acc[] = [];
		for (let i = 0; i < xs.length; i++) {
			acc = func(acc, xs[i]);
			values.push(acc);
		}
		return values;
	};
	const forwardScanPatches = (
		xs: T[],
		dxs: Patches<T[]>,
		ys: Acc[],
	): Patches<Acc[]> => {
		const res = inSchema.analyze(dxs);
		if (res === null) {
			return outSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return outSchema.fromReplace(evaluateScan(getReplaceOnly(res)));
		}

		const iStart = getMinUpdatedIndex(xs, res);
		const acc0 = iStart === 0 ? init : ys[iStart - 1];
		const replacement: Acc[] = evaluateScan(
			inSchema.apply(xs, dxs).slice(iStart),
			acc0,
		);
		return outSchema.fromPatchEntries(
			splice<Acc>(iStart, xs.length - iStart, replacement),
		);
	};
	return {
		evaluate: evaluateScan,
		forward: forwardScanPatches,
	};
};
