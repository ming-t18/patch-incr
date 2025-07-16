import { type DRO, makeReplaceOnly } from "../algebra/replaceOnly";
import { type Patches, reduceReplaceRoot } from "../data/patch";
import { BasePatchSchema } from "./base";
import type { PatchSchemaAtomic } from "./types";

export class PatchSchemaAtomicImpl<T>
	extends BasePatchSchema<T>
	implements PatchSchemaAtomic<T>
{
	static INSTANCE = new PatchSchemaAtomicImpl<unknown>();
	analyze(patches: Patches<T>): DRO<T> | { inner: Patches<T> } {
		if (patches.length === 0) {
			return null;
		}
		const res = reduceReplaceRoot(patches);
		if ("replace" in res) {
			return makeReplaceOnly(res.replace);
		}

		return { inner: res };
	}
}
