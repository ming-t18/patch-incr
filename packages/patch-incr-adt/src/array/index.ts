import {
	getReplaceOnly,
	isDRO,
	isReplaceOnly,
	makeReplaceOnly,
} from "@/replaceOnly";
import type { DRO } from "@/types";
import {
	type $A,
	type $D,
	type $T,
	type Apply,
	BaseApplyClass,
	type ReplaceOnly,
} from "@/types";
import { SpliceTable } from "./splice";

export * from "./func";
export { SpliceTable } from "./splice";

export type DeriveArrayChange<T, DT> = SpliceTable<T, DT> | DRO<readonly T[]>;
/**
 * The change-type for a JavaScript array (`T[]`) is an ordered list of concurrent splice operations,
 * (or internal changes at particular indexes.
 * @see `SpliceTable`
 */
export class AArray<A extends $A>
	extends BaseApplyClass<
		readonly $T<A>[],
		SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]>,
		null
	>
	implements
		Apply<readonly $T<A>[], SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]>>
{
	declare readonly "~apply": {
		readonly value: readonly $T<A>[];
		readonly change: SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]>;
		readonly empty: null;
		readonly replace: ReplaceOnly<readonly $T<A>[]>;
		readonly internal: SpliceTable<$T<A>, $D<A>>;
	};
	constructor(readonly inner: A) {
		super(null);
	}

	apply(
		value: readonly $T<A>[],
		change: SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]>,
	): readonly $T<A>[] {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly(change)) {
			return getReplaceOnly(change);
		}

		return change.apply(value, this.inner);
	}

	fromReplace(
		value: readonly $T<A>[],
	): SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]> {
		return makeReplaceOnly(value);
	}

	isReplace(
		d: SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]>,
	): ReplaceOnly<readonly $T<A>[]> | null {
		return isReplaceOnly(d) ? d : null;
	}

	isEmpty(d: SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]>): boolean {
		return d === null;
	}

	override canApply(
		value: readonly $T<A>[],
		change: SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]>,
	): boolean {
		if (isDRO(change)) {
			return true;
		}
		return change.canApply(value, this.inner);
	}

	override combine(
		a: SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]>,
		b: SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]>,
	): SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]> {
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
		x: SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]>,
	): SpliceTable<$T<A>, $D<A>> | DRO<readonly $T<A>[]> {
		if (x instanceof SpliceTable) {
			if (x.entries.length === 0) {
				return null;
			}
			if (
				x.entries.every((e) =>
					"change" in e
						? this.inner.isEmpty(e.change)
						: e.di === 0 && e.dj === 0,
				)
			) {
				return null;
			}
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

export const array = <A extends $A>(inner: A) => new AArray<A>(inner);

export * from "./stack";
