import {
	type PatchAdd,
	PatchOp,
	type PatchRemove,
	type PatchReplace,
	type Targeted,
} from "../../../patch";

type ArrayOp<T> =
	| (PatchAdd<[number], T> & Targeted<T[]>)
	| (PatchReplace<[number], T> & Targeted<T[]>)
	| (PatchRemove<[number]> & Targeted<T[]>);

/**
 * Generates the array patches to perform the `splice(...)` operation,
 * while maximizing the use of replace-patch if needed.

 * Unlike the actual `splice` function:
 *  - Negative indices are not supported
 *  - All parameters are mandatory
 *  - The third parameter is an array instead of a variadic
 * @param index The index to perform the splice operation, non-negative
 * @param remove The number of elements to remove at the splice index
 * @param add The array of elements to add after removing at the splice index
 */
export const splice = <T>(
	index: number,
	remove: number,
	add: T[],
): ArrayOp<T>[] => {
	if (add.length === 0) {
		if (remove === 0) {
			return [];
		}

		return Array(remove).fill({
			op: PatchOp.Remove,
			path: [index] as [number],
		} as PatchRemove<[number]> & Targeted<T[]>);
	}

	if (remove === 0) {
		return add.toReversed().map((value) => ({
			op: PatchOp.Add,
			path: [index] as [number],
			value,
		}));
	}

	if (add.length === remove) {
		return add.map((value, d) => ({
			op: PatchOp.Replace,
			path: [index + d] as [number],
			value,
		}));
	}

	if (add.length > remove) {
		const toAdd = add.slice(0, remove);
		const rest = add.slice(remove);
		return [
			...toAdd.map(
				(value, d) =>
					({
						op: PatchOp.Replace,
						path: [index + d] as [number],
						value,
					}) as ArrayOp<T>,
			),
			...splice(index + remove, 0, rest),
		];
	}

	return [
		...add.map(
			(value, d) =>
				({
					op: PatchOp.Replace,
					path: [index + d] as [number],
					value,
				}) as ArrayOp<T>,
		),
		...splice(index + add.length, remove - add.length, []),
	];
};

export const swap = <T>(arr: T[], i: number, j: number): ArrayOp<T>[] => {
	if (i === j) {
		return [];
	}
	return [
		{
			op: PatchOp.Replace,
			path: [i],
			value: arr[j],
		},
		{
			op: PatchOp.Replace,
			path: [j],
			value: arr[i],
		},
	];
};
