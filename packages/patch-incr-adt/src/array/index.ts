import { getReplaceOnly, isReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import { type Apply, BaseApplyClass, type ReplaceOnly } from "@/types";
import type { $D, $T, DRO } from "@/types/abbr";
import type { SpliceTable } from "./splice";

export class AArray<A extends Apply<T, DT>, T = $T<A>, DT = $D<A>>
	extends BaseApplyClass<T[], SpliceTable<T, DT> | DRO<T[]>, null>
	implements Apply<T[], SpliceTable<T, DT> | DRO<T[]>>
{
	declare readonly "~apply": {
		readonly value: T[];
		readonly change: SpliceTable<T, DT> | DRO<T[]>;
		readonly empty: null;
		readonly replace: ReplaceOnly<T[]>;
		readonly internal: SpliceTable<T, DT>;
	};
	constructor(readonly inner: A) {
		super(null);
	}

	apply(value: T[], change: SpliceTable<T, DT> | DRO<T[]>): T[] {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly(change)) {
			return getReplaceOnly(change);
		}

		throw new Error("TODO");
	}
	fromReplace(value: T[]): SpliceTable<T, DT> | DRO<T[]> {
		return makeReplaceOnly(value);
	}

	isReplace(d: SpliceTable<T, DT> | DRO<T[]>): ReplaceOnly<T[]> | null {
		return isReplaceOnly(d) ? d : null;
	}

	isEmpty(d: SpliceTable<T, DT> | DRO<T[]>): boolean {
		return d === null;
	}

	override canApply(
		_value: T[],
		_change: SpliceTable<T, DT> | DRO<T[]>,
	): boolean {
		return true;
	}

	override combine(
		_a: SpliceTable<T, DT> | DRO<T[]>,
		_b: SpliceTable<T, DT> | DRO<T[]>,
	): boolean {
		return true;
	}

	override canCombine(
		_a: SpliceTable<T, DT> | DRO<T[]>,
		_b: SpliceTable<T, DT> | DRO<T[]>,
	): boolean {
		return true;
	}
}
