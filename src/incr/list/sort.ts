import * as ps from "../../patchSchema";
import type {
	PatchSchemaArray,
	PatchSchemaArrayEntry,
} from "../../patchSchema/types";
import { CannotReduce, type PatchEntry, PatchOp, type Patches } from "../patch";
import type { IF } from "../types";
import { reduceArrayPatches } from "./forwardList";

/**
 * Binary search a sorted array where the strictly greater elements are on the right.
 * The comparator is same as the `Array.sort` comparator.
 *
 * ```typescript
 * const i = bisectRight(sorted, target, (a, b) => a - b)
 * expect(sorted.slice(0, i).every(z => z <= y)).toBe(true);
 * expect(sorted.slice(i).every(z => z > y)).toBe(true);
 * ```
 *
 * @returns The binary searched index.
 */
export const bisectRight = <T>(
	sorted: T[],
	target: T,
	compareFn: (a: T, b: T) => number,
): number => {
	let i = 0;
	let j = sorted.length;
	while (i < j) {
		const mid = Math.floor((i + j) / 2);
		const res = compareFn(target, sorted[mid]);
		if (res < 0) {
			j = mid;
		} else {
			i = mid + 1;
		}
	}

	return i;
};

export const bisectLeft = <T>(
	sorted: T[],
	target: T,
	compareFn: (a: T, b: T) => number,
): number => {
	let i = 0;
	let j = sorted.length;
	while (i < j) {
		const mid = Math.floor((i + j) / 2);
		const res = compareFn(target, sorted[mid]);
		if (res > 0) {
			i = mid + 1;
		} else {
			j = mid;
		}
	}

	return i;
};

export const bisectEquals = <T>(
	sorted: T[],
	target: T,
	compareFn: (a: T, b: T) => number,
): number => {
	const i = bisectLeft(sorted, target, compareFn);
	const j = bisectRight(sorted, target, compareFn);
	let k = i;
	for (; k <= j && k < sorted.length; k++) {
		if (compareFn(target, sorted[k]) === 0) {
			return k;
		}
	}
	return -1;
};

export const sort = <T>(compareFn?: (a: T, b: T) => number): IF<T[], T[]> => {
	const elemSchema = ps.atomic<T>();
	const inputSchema = ps.array(elemSchema);
	const outputSchema = ps.array(elemSchema);
	const evaluateSort = (xs: T[]) => xs.toSorted(compareFn);

	const compareFn1 =
		compareFn ?? ((a: T, b: T) => String(a).localeCompare(String(b)));
	const forwardSort = reduceArrayPatches(
		inputSchema,
		outputSchema,
		evaluateSort,
		(
			unsorted: T[],
			entry: PatchSchemaArrayEntry<T>,
			sorted: T[],
		): Patches<T[]> | CannotReduce => {
			if ("inner" in entry) {
				const [index] = entry.path;
				const prev = unsorted[index];
				const updated: T = elemSchema.apply(
					prev,
					elemSchema.fromPatchEntries([entry.inner]),
				);
				const index0: number = bisectEquals(sorted, prev, compareFn1);
				const index1: number = bisectEquals(sorted, updated, compareFn1);
				if (index0 === -1) {
					throw new Error("forwardSort: existing value not found");
				}

				if (index0 !== index1) {
					// TOOD changing ordering
					return CannotReduce;
				}

				return outputSchema.fromEntries([
					{
						inner: entry.inner,
						path: [index1],
					},
				]);
			}

			const { op } = entry;
			if (op === PatchOp.Replace) {
				const prev = unsorted[entry.path[0]];
				const next = entry.value;
				const indexPrev: number = bisectEquals(sorted, prev, compareFn1);
				if (indexPrev === -1) {
					throw new Error("forwardSort: existing value not found");
				}

				if (compareFn1(prev, next) !== 0) {
					// TODO changing ordering
					return CannotReduce;
				}

				return outputSchema.fromEntries([
					{
						op: PatchOp.Replace,
						path: [indexPrev],
						value: next,
					},
				]);
			}

			if (op === PatchOp.Add) {
				const toInsert = entry.value;
				const indexNext: number = bisectLeft(sorted, toInsert, compareFn1);
				return outputSchema.fromEntries([
					{
						op: PatchOp.Add,
						value: toInsert,
						path: [indexNext],
					},
				]);
			}

			if (op === PatchOp.Remove) {
				const toRemove = unsorted[entry.path[0]];
				const indexSorted: number = bisectEquals(sorted, toRemove, compareFn1);
				if (indexSorted === -1) {
					throw new Error("forwardSort: remove: value to remove not found");
				}
				return outputSchema.fromEntries([
					{
						op: PatchOp.Remove,
						path: [indexSorted],
					},
				]);
			}
			return CannotReduce;
		},
	);

	return {
		evaluate: evaluateSort,
		forward: forwardSort,
	};
};
