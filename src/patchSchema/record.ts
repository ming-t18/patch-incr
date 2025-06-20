import type { DRO } from "../algebra";
import { makeReplaceOnly } from "../algebra/replaceOnly";
import {
	type PatchEntry,
	type Patches,
	reduceReplaceRoot,
} from "../incr/patch";
import { BasePatchSchema } from "./base";
import type {
	AnyRecord,
	InferTypeFromRecordConstruction,
	InnerPatches,
	PatchSchemaRecord,
	RecordConstruction,
} from "./types";

export class PatchSchemaRecordImpl<
		C extends RecordConstruction,
		Record extends AnyRecord = InferTypeFromRecordConstruction<C>,
	>
	extends BasePatchSchema<Record>
	implements PatchSchemaRecord<C, Record>
{
	constructor(public readonly $: C) {
		super();
	}

	analyze(
		patches: Patches<Record>,
	): DRO<Record> | InnerPatches<Record, keyof Record> {
		if (patches.length === 0) {
			return null;
		}

		const res = reduceReplaceRoot(patches);
		if ("replace" in res) {
			return makeReplaceOnly(res.replace);
		}

		const obj: InnerPatches<Record, keyof Record> = {};
		for (const entry of patches) {
			const [key, ...pathInner] = entry.path;
			const key1 = key as keyof Record;
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

	liftKey<K extends keyof Record>(
		key: K,
		change: Patches<Record[K]>,
	): Patches<Record> {
		return change.map(
			(c) =>
				({
					...c,
					path: [key, ...c.path],
				}) as PatchEntry<Record>,
		);
	}
}
