import { getReplaceOnly, isReplaceOnly } from "@/algebra";
import type { ReduceAlgebra } from "@/algebra/reduceAlgebra";
import { applyPatches, type Patches, PatchOp } from "@/patch";
import * as ps from "@/patchSchema";
import type { IF } from "@/types";

/** Given an array, aggregates it with a commutative algebra. */
export const reduce = <Acc, T>(
	alg: ReduceAlgebra<Acc, T>,
): IF<T[], Acc, Patches<T[]>, Patches<Acc>> => {
	const entrySchema = ps.atomic<T>();
	const arrSchema = ps.array(entrySchema);
	const outSchema = ps.atomic<Acc>();
	const evaluateReduce = (xs: T[]): Acc =>
		xs.reduce((a, x) => alg.add(a, x), alg.init);

	const forwardReduce = (
		xs: T[],
		dxs: Patches<T[]>,
		acc: Acc,
	): Patches<Acc> => {
		const res = arrSchema.analyze(dxs);
		if (res === null) return outSchema.empty;
		if (isReplaceOnly(res)) {
			return outSchema.fromReplace(evaluateReduce(getReplaceOnly(res)));
		}

		let acc1 = acc;
		let xs1 = xs;
		for (const entry of res) {
			if ("inner" in entry) {
				const index = entry.path[0];
				const xs2 = applyPatches(
					xs1,
					arrSchema.liftIndex(index, [entry.inner]),
				);

				const prevValue = xs1[index];
				const nextValue = xs2[index];
				acc1 = alg.replace(acc1, prevValue, nextValue);
				xs1 = xs2;
				continue;
			}
			const xs2 = applyPatches(xs1, [entry] as Patches);

			const index = entry.path[0];
			if (entry.op === PatchOp.Add) {
				acc1 = alg.add(acc1, entry.value);
			} else if (entry.op === PatchOp.Replace) {
				const prevValue = xs1[index as number];
				acc1 = alg.replace(acc1, prevValue, entry.value);
			} else if (entry.op === PatchOp.Remove) {
				const valueToRemove = xs1[index as number];
				acc1 = alg.remove(acc1, valueToRemove);
			} else {
				throw new Error();
			}
			xs1 = xs2;
		}
		return outSchema.fromReplace(acc1);
	};

	return {
		evaluate: evaluateReduce,
		forward: forwardReduce,
	};
};
