import type { ChangeBuilder, ReplaceOnly } from "../algebra";
import { makeReplaceOnly } from "../algebra/replaceOnly";
import {
	applyPatches,
	type PatchEntry,
	type Patches,
	reduceReplaceRoot,
	replacePatch,
} from "../data/patch";
import type { TypesKey } from "../data/typeHelpers";
import type { PatchSchema } from "./types";

const EMPTY: readonly never[] = Object.freeze([]);

export class PatchesBuilder<T> implements ChangeBuilder<Patches<T>> {
	private readonly _patches: Patches<T> = [];

	append(patches: Patches<T>): void {
		this._patches.push(...patches);
	}

	build(): Patches<T> {
		return this._patches;
	}
}

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

	builder() {
		return new PatchesBuilder<T>();
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
		return replacePatch<T, never>(value, EMPTY as never);
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

// @ts-ignore TS6169
type _DontEliminateWorkaround = TypesKey;
