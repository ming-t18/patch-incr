import { makeReplaceOnly } from "../algebra/replaceOnly";
import { MultiWeakMap } from "../cache/weak_map";
import { type Patches, applyPatches, replacePatch } from "./patch";
import type { IF } from "./types";

export const memoInterm = <
	Input extends WeakKey,
	Output extends WeakKey,
	Interm,
>(
	f1: IF<Input, [Output, Interm]>,
	memo0?: MultiWeakMap<[Input, Output], [Output, Interm]>,
): IF<Input, Output> => {
	const memo = memo0 ?? new MultiWeakMap<[Input, Output], [Output, Interm]>();
	const invokeMemoPair = (x: Input): Output => {
		const p = f1.invoke(x);
		const y = p[0];
		memo.set([x, y], p);
		return y;
	};

	const forwardMemoPair = (
		x: Input,
		dx: Patches<Input>,
		y: Output,
	): Patches<Output> => {
		const pair = memo.getOrCompute([x, y], () => f1.invoke(x));
		const dPair = f1.forward(x, dx, pair);
		const hasReplaceRoot = dPair.find((x) => x.path.length === 0);
		if (hasReplaceRoot) {
			const pair1 = applyPatches(pair, dPair);
			const y1 = pair1[0];
			const x1 = applyPatches(x, dx);
			memo.set([x1, y1], pair1);
			return replacePatch(y1);
		}

		return dPair.flatMap((entry) => {
			if (entry.path[0] === 0) {
				return [{ ...entry, pair: entry.path.slice(1) }];
			}
			return [];
		}) as Patches<Output>;
	};
	return { invoke: invokeMemoPair, forward: forwardMemoPair };
};
