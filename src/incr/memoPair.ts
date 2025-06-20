import { getReplaceOnly, isReplaceOnly } from "../algebra/replaceOnly";
import * as ps from "../patchSchema";
import { applyPatches, type Patches, replacePatch } from "./patch";
import type { IF, NoForwardOutput } from "./types";

export const memoInterm = <Input extends WeakKey, Output, Interm>(
	f1: IF<Input, [Output, Interm]>,
	memo0?: WeakMap<Input, [Output, Interm]>,
	strict = false,
): IF<Input, Output, Patches<Input>, Patches<Output>, NoForwardOutput> => {
	const outSchema = ps.atomic<Output>();
	const pairSchema = ps.tuple(ps.atomic<Output>(), ps.atomic<Interm>());
	const memo = memo0 ?? new WeakMap();
	const evaluateMemoPair = (x: Input): Output => {
		const p = f1.evaluate(x);
		const y = p[0];
		memo.set(x, p);
		return y;
	};

	const forwardMemoPair = (
		x: Input,
		dx: Patches<Input>,
		_y?: Output,
	): Patches<Output> => {
		let pair = memo.get(x);
		if (pair === undefined) {
			if (strict) {
				console.error("key not found", { x, dx });
				throw new Error("Key not found");
			}
			pair = f1.evaluate(x);
			memo.set(x, pair);
		}
		const dPair = f1.forward(x, dx, pair);
		const hasReplaceRoot = dPair.find((x) => x.path.length === 0);
		if (hasReplaceRoot) {
			const pair1 = applyPatches(pair, dPair);
			const y1 = pair1[0];
			const x1 = applyPatches(x, dx);
			memo.set(x1, pair1);
			return replacePatch(y1);
		}

		const res = pairSchema.analyze(dPair);
		if (res === null) {
			return outSchema.empty;
		}

		if (isReplaceOnly(res)) {
			const pair1 = getReplaceOnly(res);
			memo.set(x, pair1);
			return outSchema.fromReplace(pair1[0]);
		}

		return res[0]?.inner ?? pairSchema.$[0].empty;
	};
	return { evaluate: evaluateMemoPair, forward: forwardMemoPair };
};

export const memoIntermR = <Input, Output extends WeakKey, Interm>(
	f1: IF<Input, [Output, Interm]>,
	memo0?: WeakMap<Output, [Output, Interm]>,
	strict = false,
): IF<Input, Output> => {
	const outSchema = ps.atomic<Output>();
	const memo = memo0 ?? new WeakMap();
	const pairSchema = ps.tuple(ps.atomic<Output>(), ps.atomic<Interm>());

	const evaluateMemoPair = (x: Input): Output => {
		const p = f1.evaluate(x);
		const y = p[0];
		memo.set(y, p);
		return y;
	};

	const forwardMemoPair = (
		x: Input,
		dx: Patches<Input>,
		y: Output,
	): Patches<Output> => {
		let pair: [Output, Interm];
		if (memo.has(y)) {
			pair = memo.get(y) as [Output, Interm];
		} else {
			if (strict) {
				throw new Error("Key not found");
			}
			pair = f1.evaluate(x);
			memo.set(y, pair);
		}

		const dPair = f1.forward(x, dx, pair);
		const res = pairSchema.analyze(dPair);
		if (res === null) {
			return outSchema.empty;
		}
		if (isReplaceOnly(res)) {
			const pair1 = getReplaceOnly(res);
			memo.set(y, pair1);
			return outSchema.fromReplace(pair1[0]);
		}

		return res[0]?.inner ?? pairSchema.$[0].empty;
	};
	return { evaluate: evaluateMemoPair, forward: forwardMemoPair };
};
