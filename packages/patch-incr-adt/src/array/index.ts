import {
	getReplaceOnly,
	isDRO,
	isReplaceOnly,
	makeReplaceOnly,
} from "@/replaceOnly";
import {
	type AnyApply,
	type Apply,
	BaseApplyClass,
	type ReplaceOnly,
} from "@/types";
import type { $D, $T, DRO } from "@/types/abbr";
import { SpliceTable } from "./splice";

export { FArray } from "./func";

export type DeriveArrayChange<T, DT> = SpliceTable<T, DT> | DRO<readonly T[]>;
/**
 * The change-type for a JavaScript array (`T[]`) is an ordered list of concurrent splice operations,
 * (or internal changes at particular indexes.
 * @see `SpliceTable`
 */
export class AArray<A extends Apply<T, DT>, T = $T<A>, DT = $D<A>>
	extends BaseApplyClass<
		readonly T[],
		SpliceTable<T, DT> | DRO<readonly T[]>,
		null
	>
	implements Apply<readonly T[], SpliceTable<T, DT> | DRO<readonly T[]>>
{
	declare readonly "~apply": {
		readonly value: readonly T[];
		readonly change: SpliceTable<T, DT> | DRO<readonly T[]>;
		readonly empty: null;
		readonly replace: ReplaceOnly<readonly T[]>;
		readonly internal: SpliceTable<T, DT>;
	};
	constructor(readonly inner: A) {
		super(null);
	}

	apply(
		value: readonly T[],
		change: SpliceTable<T, DT> | DRO<readonly T[]>,
	): readonly T[] {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly(change)) {
			return getReplaceOnly(change);
		}

		return change.apply(value, this.inner);
	}

	fromReplace(value: readonly T[]): SpliceTable<T, DT> | DRO<readonly T[]> {
		return makeReplaceOnly(value);
	}

	isReplace(
		d: SpliceTable<T, DT> | DRO<readonly T[]>,
	): ReplaceOnly<readonly T[]> | null {
		return isReplaceOnly(d) ? d : null;
	}

	isEmpty(d: SpliceTable<T, DT> | DRO<readonly T[]>): boolean {
		return d === null;
	}

	override canApply(
		value: readonly T[],
		change: SpliceTable<T, DT> | DRO<readonly T[]>,
	): boolean {
		if (isDRO(change)) {
			return true;
		}
		return change.canApply(value, this.inner);
	}

	override combine(
		a: SpliceTable<T, DT> | DRO<readonly T[]>,
		b: SpliceTable<T, DT> | DRO<readonly T[]>,
	): SpliceTable<T, DT> | DRO<readonly T[]> {
		if (a === null) {
			return b;
		}
		if (b === null) {
			return a;
		}
		if (isReplaceOnly(b)) {
			return b;
		}
		if (isReplaceOnly(a)) {
			return makeReplaceOnly(this.apply(getReplaceOnly(a), b));
		}

		return a.combine(b, this.inner);
	}

	override trim(
		x: SpliceTable<T, DT> | DRO<readonly T[]>,
	): SpliceTable<T, DT> | DRO<readonly T[]> {
		if (x instanceof SpliceTable && x.entries.length === 0) {
			return null;
		}
		return x;
	}

	// override canCombine(
	// 	_a: SpliceTable<T, DT> | DRO<T[]>,
	// 	_b: SpliceTable<T, DT> | DRO<T[]>,
	// ): boolean {
	// 	return true;
	// }
}

export const array = <A extends AnyApply, T = $T<A>, DT = $D<A>>(inner: A) =>
	new AArray<A, T, DT>(inner);

export * from "./stack";
