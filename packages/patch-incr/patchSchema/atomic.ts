import { type DRO, makeReplaceOnly } from "../algebra/replaceOnly";
import { type Patches, reduceReplaceRoot } from "../patch";
import { BasePatchSchema } from "./base";
import type { PatchSchemaAtomic } from "./types";

export class PatchSchemaAtomicImpl<T>
	extends BasePatchSchema<T>
	implements PatchSchemaAtomic<T>
{
	static INSTANCE = new PatchSchemaAtomicImpl<unknown>(false);
	static INSTANCE_REPLACE_ONLY = new PatchSchemaAtomicImpl<unknown>(true);
	constructor(private readonly _replaceOnly = false) {
		super();
	}

	analyze(patches: Patches<T>): DRO<T> | { inner: Patches<T> } {
		if (patches.length === 0) {
			return null;
		}
		const res = reduceReplaceRoot(patches);
		if ("replace" in res) {
			return makeReplaceOnly(res.replace);
		}

		if (this._replaceOnly) {
			throw new Error(
				"null change or replace-root change expected here, but got internal change",
			);
		}

		return { inner: res };
	}
}
