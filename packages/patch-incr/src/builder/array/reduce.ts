import { getReplaceOnly, isReplaceOnly } from "@/algebra";
import type { IncReduceAlgebra } from "@/algebra/incReduce";
import type { ReduceAlgebra } from "@/algebra/reduceAlgebra";
import { type Patches, PatchOp } from "@/patch";
import * as ps from "@/patchSchema";
import type { IF } from "@/types";

/** Given an array, aggregates it with a commutative algebra. */
export const reduce = <Acc, T>(alg: ReduceAlgebra<Acc, T>): IF<T[], Acc> => {
	const accSchema = ps.atomic<Acc>();
	const entrySchema = ps.atomic<T>();
	const arrSchema = ps.array(entrySchema);
	const evaluateReduce = (xs: T[]): Acc =>
		xs.reduce((a, x) => alg.add(a, x), alg.init);

	const forwardReduce = (
		xs0: T[],
		dxs: Patches<T[]>,
		acc0: Acc,
	): Patches<Acc> => {
		const res = arrSchema.analyze(dxs);
		if (res === null) return accSchema.empty;
		if (isReplaceOnly(res)) {
			return accSchema.fromReplace(evaluateReduce(getReplaceOnly(res)));
		}

		let acc = acc0;
		let xs = xs0;
		for (const entry of res) {
			if ("inner" in entry) {
				const index = entry.path[0];
				const xsNext = arrSchema.apply(
					xs,
					arrSchema.liftIndex(
						index,
						entrySchema.fromPatchEntries([entry.inner]),
					),
				);

				const prevValue = xs[index];
				const nextValue = xsNext[index];
				acc = alg.replace(acc, prevValue, nextValue);
				xs = xsNext;
			} else {
				const index = entry.path[0];
				if (entry.op === PatchOp.Add) {
					acc = alg.add(acc, entry.value);
				} else if (entry.op === PatchOp.Replace) {
					const prevValue = xs[index as number];
					acc = alg.replace(acc, prevValue, entry.value);
				} else if (entry.op === PatchOp.Remove) {
					const valueToRemove = xs[index as number];
					acc = alg.remove(acc, valueToRemove);
				} else {
					throw new Error();
				}

				xs = arrSchema.apply(xs, arrSchema.fromPatchEntries([entry]));
			}
		}
		return accSchema.fromReplace(acc);
	};

	return {
		evaluate: evaluateReduce,
		forward: forwardReduce,
	};
};

/**
 * Incremental version of the `reduce` on a commutative and associative algebra
 * where the incremental change on the array (`DT`) can be converted into
 * the incremental change (`DAcc`) on the accumulator (`Acc`).
 *
 * Examples of incremental reduce algebras:
 *  - Merging multiple records (`Record<K, V>`)
 *  - Merging multiple maps (`Map<K, V>`)
 *  - Incremental version of `Object.fromEntries`
 */
export const reduceInc = <Acc, T>(
	alg: IncReduceAlgebra<Acc, T>,
): IF<T[], Acc> => {
	type DAcc = Patches<Acc>;
	type DT = Patches<T>;
	const accSchema = ps.atomic<Acc>();
	const entrySchema = ps.atomic<T>();
	const arrSchema = ps.array(entrySchema);
	const evaluateReduce = (xs: T[]): Acc =>
		xs.reduce((a, x) => alg.add(a, x), alg.init);

	const forwardReduce = (xs0: T[], dxs: Patches<T[]>, acc0: Acc): DAcc => {
		const res = arrSchema.analyze(dxs);
		if (res === null) return accSchema.empty;
		if (isReplaceOnly(res)) {
			return accSchema.fromReplace(evaluateReduce(getReplaceOnly(res)));
		}

		let acc = acc0;
		let xs = xs0;
		let dAcc: DAcc = accSchema.empty;
		for (const entry of res) {
			// d2Acc: contribution to dAcc
			let d2Acc: DAcc;
			let xsNext: T[];
			if ("inner" in entry) {
				const index = entry.path[0];
				const dt = entrySchema.fromPatchEntries([entry.inner]) as DT;
				const prevValue = xs[index];
				d2Acc = alg.forwardInternal(acc0, prevValue, dt);
				xsNext = arrSchema.apply(xs, arrSchema.liftIndex(index, [entry.inner]));
			} else {
				const index = entry.path[0];
				if (entry.op === PatchOp.Add) {
					d2Acc = alg.forwardAdd(acc, entry.value);
				} else if (entry.op === PatchOp.Replace) {
					const prevValue = xs[index as number];
					d2Acc = alg.forwardReplace(acc, prevValue, entry.value);
				} else if (entry.op === PatchOp.Remove) {
					const valueToRemove = xs[index as number];
					d2Acc = alg.forwardRemove(acc, valueToRemove);
				} else {
					throw new Error();
				}
				xsNext = arrSchema.apply(xs, arrSchema.fromPatchEntries([entry]));
			}

			dAcc = accSchema.combine(dAcc, d2Acc);
			acc = accSchema.apply(acc, d2Acc);
			xs = xsNext;
		}
		return dAcc;
	};

	return {
		evaluate: evaluateReduce,
		forward: forwardReduce,
	};
};
