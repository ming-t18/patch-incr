import {
	getReplaceOnly,
	isReplaceOnly,
	makeReplaceOnly,
	type ReplaceOnly,
} from "@/algebra/replaceOnly";
import * as ps from "@/patchSchema";
import type {
	InnerPatches,
	PatchSchema,
	PatchSchemaReplaceOnly,
} from "@/patchSchema/types";
import type { Forward, IF } from "@/types";
import {
	applyPatches,
	CannotReduce,
	liftPatches,
	type Patches,
	PatchOp,
	reducePatches,
} from "../../patch";

/**
 * Incremental version of `Object.entries`.
 *
 * Important: This function is not patch coherent unless we disregard the ordering
 * of keys. The incrementalization will always insert the new keys to the end, while
 * the JS engine can order the keys in their own way.
 */
export const entries = <Key extends string = string, Value = unknown>(): IF<
	Record<Key, Value>,
	[Key, Value][]
> => {
	type Object = Record<Key, Value>;
	const evaluateEntries = (obj: Object) =>
		Object.entries(obj) as [Key, Object[Key]][];
	const forwardEntries: Forward<Object, [Key, Object[Key]][]> = reducePatches<
		Object,
		[Key, Object[Key]][]
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
>(): IF<Object, Key[]> => {
	const evaluateKeys = (obj: Object) => Object.keys(obj) as Key[];
	const forwardKeys: Forward<Object, Key[]> = reducePatches<Object, Key[]>(
		evaluateKeys,
		(_input, entry, output) => {
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
		},
	);
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
export const fromEntries = <Key extends string = string, Value = unknown>(
	keySchema = ps.replaceOnly<Key>() as PatchSchemaReplaceOnly<Key>,
	valueSchema = ps.atomic<Value>() as PatchSchema<Value>,
): IF<[Key, Value][], Record<Key, Value>> => {
	const pairSchema = ps.tuple(keySchema, valueSchema);
	const schema = ps.array(pairSchema);
	const evaluateFromEntries = (entries: [Key, Value][]) =>
		Object.fromEntries<Value>(entries) as Record<Key, Value>;
	const outSchema = ps.mapping<Key, Value>(keySchema, valueSchema);

	const forwardFromEntries = (
		entries0: [Key, Value][],
		change: Patches<[Key, Value][]>,
		_output: Record<Key, Value>,
	): Patches<Record<Key, Value>> => {
		const res = schema.analyze(change);
		if (res === null) {
			return outSchema.empty;
		}
		if (isReplaceOnly(res)) {
			return outSchema.fromReplace(evaluateFromEntries(getReplaceOnly(res)));
		}

		const removes = new Set<Key>();
		const adds: Partial<Record<Key, ReplaceOnly<Value> | Patches<Value>>> = {};
		const addEntry = (newKey: Key, newValue: Value) => {
			if (newKey in removes) {
				removes.delete(newKey);
			}
			adds[newKey] = makeReplaceOnly(newValue);
		};
		const patchEntry = (newKey: Key, change: Patches<Value>) => {
			if (newKey in removes) {
				removes.delete(newKey);
			}
			const existing = adds[newKey];
			if (!existing) {
				adds[newKey] = change;
			} else if (isReplaceOnly(existing)) {
				adds[newKey] = [
					{ op: PatchOp.Replace, path: [], value: getReplaceOnly(existing) },
					...change,
				];
			} else {
				adds[newKey] = [...(existing as Patches<Value>), ...change];
			}
		};
		const removeEntry = (keyToRemove: Key) => {
			if (keyToRemove in adds) {
				delete adds[keyToRemove];
			}
			removes.add(keyToRemove);
		};
		let entries = entries0;
		for (const entry of res) {
			if ("inner" in entry) {
				const {
					path: [index],
					inner,
				} = entry;
				const res1 = pairSchema.analyze([inner]);
				if (res1 === null) {
					continue;
				} else if (isReplaceOnly(res1)) {
					const [newKey, newValue] = getReplaceOnly(res1);
					const [prevKey, _prevValue] = entries[index];
					removeEntry(prevKey);
					addEntry(newKey, newValue);
				} else {
					const res2 = res1 as InnerPatches<[Key, Value], keyof [Key, Value]>;
					const dNewKey = res2[0];
					const dNewValue = res2[1];
					const didKeyChange = dNewKey
						? keySchema.analyze(dNewKey?.inner)
						: null;
					const [prevKey, prevValue] = entries[index];
					if (didKeyChange !== null) {
						const newKey = getReplaceOnly(didKeyChange);
						removeEntry(prevKey);
						if (dNewValue) {
							addEntry(newKey, applyPatches(prevValue, dNewValue?.inner ?? []));
						} else {
							addEntry(newKey, prevValue);
						}
					} else {
						patchEntry(prevKey, dNewValue?.inner ?? []);
					}
				}
				entries = applyPatches(entries, schema.liftIndex(index, [inner]));
				continue;
			}
			const op = entry.op;
			if (op === PatchOp.Add) {
				const [newKey, newValue] = entry.value;
				addEntry(newKey, newValue);
			} else if (op === PatchOp.Replace) {
				const [index] = entry.path;
				const [newKey, newValue] = entry.value;
				const [prevKey, _prevValue] = entries[index];
				removeEntry(prevKey);
				addEntry(newKey, newValue);
			} else if (op === PatchOp.Remove) {
				const [index] = entry.path;
				removeEntry(entries[index][0]);
			}

			entries = applyPatches(entries, [entry]);
		}

		const combined: Patches<Record<Key, Value>> = [];
		for (const remove of removes) {
			combined.push({ op: PatchOp.Remove, path: [remove] });
		}
		for (const pair of Object.entries(adds)) {
			const [key, value] = pair as [
				Key,
				ReplaceOnly<Value> | Patches<Value> | undefined,
			];
			if (!value) {
				continue;
			}
			if (isReplaceOnly(value)) {
				combined.push({
					op: PatchOp.Replace,
					path: [key],
					value: getReplaceOnly(value),
				});
			} else {
				combined.push(...(liftPatches(key, value) as never[]));
			}
		}
		return combined;
	};

	return {
		evaluate: evaluateFromEntries,
		forward: forwardFromEntries,
	};
};
