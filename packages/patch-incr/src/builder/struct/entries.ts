import { objectFromEntriesAlgebra } from "@/algebra/incReduce";
import type { Forward, IF } from "@/types";
import type { Distinct, Entries } from "@/uniqueTypes";
import { CannotReduce, PatchOp, reducePatches } from "../../patch";
import { reduceInc } from "../array/reduce";

/**
 * Incremental version of `Object.entries`.
 *
 * Important: This function is not patch coherent unless we disregard the ordering
 * of keys. The incrementalization will always insert the new keys to the end, while
 * the JS engine can order the keys in their own way.
 */
export const entries = <Key extends string = string, Value = unknown>(): IF<
	Record<Key, Value>,
	Entries<Key, Value>
> => {
	type Object = Record<Key, Value>;
	const evaluateEntries = (obj: Object) =>
		Object.entries(obj) as Entries<Key, Object[Key]>;
	const forwardEntries: Forward<Object, [Key, Object[Key]][]> = reducePatches<
		Object,
		Entries<Key, Object[Key]>
	>(evaluateEntries, (input, entry, output) => {
		if (entry.path.length === 0) {
			return CannotReduce;
		}

		const op = entry.op;
		const key = entry.path[0] as Key;
		const outIndex = output.findIndex((x) => x[0] === key);

		if (entry.path.length > 1) {
			if (outIndex === -1) {
				throw new Error("entries: expecting corresponding entry to be found");
			}

			return [
				{
					...entry,
					path: [outIndex, 1, ...entry.path.slice(1)],
				},
			];
		}

		if (op === PatchOp.Add) {
			return outIndex === -1
				? [
						{
							op: PatchOp.Add,
							path: ["-"],
							value: [key, input[key] as Value],
						},
					]
				: [];
		} else if (op === PatchOp.Remove) {
			return outIndex === -1
				? []
				: [
						{
							op: PatchOp.Remove,
							path: [outIndex],
						},
					];
		} else if (op === PatchOp.Replace) {
			return outIndex === -1
				? [
						{
							op: PatchOp.Add,
							path: ["-"],
							value: [key, entry.value],
						},
					]
				: [
						{
							op: PatchOp.Replace,
							path: [outIndex, 1],
							value: entry.value,
						},
					];
		}
		throw new Error(`Unsupported patch op: ${op}`);
	});
	return {
		evaluate: evaluateEntries,
		forward: forwardEntries,
	};
};

/**
 * Incremental version of `Object.keys`.
 *
 * Important: This function is not patch coherent unless we disregard the ordering
 * of keys. The incrementalization will always insert the new keys to the end, while
 * the JS engine can order the keys in their own way.
 */
export const keys = <
	Key extends string = string,
	Object extends Record<Key, unknown> = Record<Key, unknown>,
>(): IF<Object, Distinct<Key>> => {
	const evaluateKeys = (obj: Object) => Object.keys(obj) as Distinct<Key>;
	const forwardKeys: Forward<Object, Distinct<Key>> = reducePatches<
		Object,
		Distinct<Key>
	>(evaluateKeys, (_input, entry, output) => {
		const op = entry.op;
		const key = entry.path[0] as Key;
		const outIndex = output.indexOf(key);
		if (entry.path.length === 0) {
			return CannotReduce;
		}

		if (entry.path.length === 1) {
			if (op === PatchOp.Add) {
				return outIndex === -1
					? [
							{
								op: PatchOp.Add,
								path: ["-"],
								value: key,
							},
						]
					: [];
			} else if (op === PatchOp.Remove) {
				return outIndex === -1
					? []
					: [
							{
								op: PatchOp.Remove,
								path: [outIndex],
							},
						];
			} else if (op === PatchOp.Replace) {
				// value changes, key doesn't
				return outIndex === -1
					? [
							{
								op: PatchOp.Add,
								path: ["-"],
								value: key,
							},
						]
					: [];
			}
			throw new Error(`Unsupported patch op: ${op}`);
		}

		return [];
	});
	return {
		evaluate: evaluateKeys,
		forward: forwardKeys,
	};
};

/**
 * Incremental version of `Object.fromEntries`.
 *
 * Duplicate keys are not supported.
 */
export const fromEntries = <Key extends string = string, Value = unknown>(): IF<
	Entries<Key, Value>,
	Record<Key, Value>
> => reduceInc(objectFromEntriesAlgebra<Key, Value>({} as Record<Key, Value>));
