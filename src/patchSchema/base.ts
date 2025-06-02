import type { ReplaceOnly } from "../algebra";
import { makeReplaceOnly } from "../algebra/replaceOnly";
import {
	type PatchEntry,
	type Patches,
	applyPatches,
	reduceReplaceRoot,
	replacePatch,
} from "../incr/patch";
import type { TypesKey } from "../incr/typeHelpers";
import type { PatchSchema } from "./types";

const EMPTY: readonly never[] = Object.freeze([]);

export class BasePatchSchema<T> implements PatchSchema<T> {
	combine(left: Patches<T>, right: Patches<T>) {
		if (left.length === 0) {
			return right;
		}
		if (right.length === 0) {
			return left;
		}

		return [...left, ...right];
	}

	fromPatchEntries(entries: PatchEntry<T>[]): Patches<T> {
		return entries;
	}

	apply(value: T, patches: Patches<T>): T {
		return applyPatches(value, patches);
	}

	get empty(): Patches<T> {
		return EMPTY as never;
	}

	fromReplace(value: T) {
		return replacePatch(value, EMPTY as never);
	}

	isEmpty(patches: Patches<T>) {
		return patches.length === 0;
	}

	isReplace(patches: Patches<T>): ReplaceOnly<T> | null {
		const res = reduceReplaceRoot(patches);
		if ("replace" in res) {
			return makeReplaceOnly(res.replace);
		}
		return null;
	}

	declare readonly [TypesKey]: { value: T; change: Patches<T> };
}
