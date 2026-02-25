import type { IF } from "@/types";
import { CannotReduce, type Patches, PatchOp } from "../../patch";
import * as ps from "../../patchSchema";
import type { PatchSchemaArrayEntry } from "../../patchSchema/types";
import { forwardWithArraySchema } from "./helpers/forwardArray";

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

	const _replace = (
		comp: number,
		next: T,
		indexPrev: number,
		indexNext: number,
	) => {
		const add = {
			op: PatchOp.Add as const,
			path: [indexNext] as [number],
			value: next,
		};
		const remove = {
			op: PatchOp.Remove as const,
			path: [indexPrev] as [number],
		};
		if (comp > 0) {
			return outputSchema.fromEntries([remove, add]);
		}

		return outputSchema.fromEntries([add, remove]);
	};

	const forwardSort = forwardWithArraySchema(
		inputSchema,
		outputSchema,
		evaluateSort,
		(
			unsorted: T[],
			entry: PatchSchemaArrayEntry<T>,
			sorted: T[],
		): Patches<T[]> | CannotReduce => {
			if ("inner" in entry) {
				const prev = unsorted[entry.path[0]];
				const indexPrev: number = bisectEquals(sorted, prev, compareFn1);
				if (indexPrev === -1) {
					throw new Error("forwardSort: existing value not found");
				}

				const next: T = elemSchema.apply(
					prev,
					elemSchema.fromPatchEntries([entry.inner]),
				);
				const comp = compareFn1(prev, next);
				if (comp === 0) {
					return outputSchema.fromEntries([
						{
							path: [indexPrev],
							inner: entry.inner,
						},
					]);
				}

				const indexNext: number = bisectLeft(sorted, next, compareFn1);
				return _replace(comp, next, indexPrev, indexNext);
			}

			const { op } = entry;
			if (op === PatchOp.Replace) {
				const prev = unsorted[entry.path[0]];
				const next = entry.value;
				const indexPrev: number = bisectEquals(sorted, prev, compareFn1);
				if (indexPrev === -1) {
					throw new Error("forwardSort: existing value not found");
				}

				const comp = compareFn1(prev, next);
				if (comp === 0) {
					return outputSchema.fromEntries([
						{
							op: PatchOp.Replace,
							path: [indexPrev],
							value: next,
						},
					]);
				}

				const indexNext: number = bisectLeft(sorted, next, compareFn1);
				return _replace(comp, next, indexPrev, indexNext);
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
