import type { DRO } from "../algebra";
import { makeReplaceOnly } from "../algebra/replaceOnly";
import {
	liftPatches,
	type PatchEntry,
	type Patches,
	reduceReplaceRoot,
} from "../patch";
import { BasePatchSchema } from "./base";
import type {
	InnerPatches,
	PatchSchema,
	PatchSchemaMapping,
	PatchSchemaReplaceOnly,
} from "./types";

export class PatchSchemaMappingImpl<
		Key extends string,
		Value,
		KS extends PatchSchemaReplaceOnly<Key> = PatchSchemaReplaceOnly<Key>,
		VS extends PatchSchema<Value> = PatchSchema<Value>,
	>
	extends BasePatchSchema<Record<Key, Value>>
	implements PatchSchemaMapping<Key, Value, KS, VS>
{
	constructor(
		public readonly $key: KS,
		public readonly $value: VS,
	) {
		super();
	}

	analyze(
		patches: Patches<Record<Key, Value>>,
	): DRO<Record<Key, Value>> | InnerPatches<Record<Key, Value>, Key> {
		if (patches.length === 0) {
			return null;
		}

		const res = reduceReplaceRoot(patches);
		if ("replace" in res) {
			return makeReplaceOnly(res.replace);
		}

		const obj: InnerPatches<Record<Key, Value>, Key> = {};
		for (const entry of patches) {
			const [key, ...pathInner] = entry.path;
			const key1: Key = key as never;
			if (!obj[key1]) {
				obj[key1] = {
					path: [key1],
					inner: [],
				};
			}
			obj[key1].inner.push({ ...entry, path: pathInner } as PatchEntry<never>);
		}
		return obj;
	}

	liftKey(key: Key, change: Patches<Value>): Patches<Record<Key, Value>> {
		return liftPatches(key, change);
	}
}
