import type { $D, $T } from "@/types/abbr";
import { type Apply, BaseApplyClass, type ReplaceOnly } from "@/types/algebra";

/**
 * An abstract class for augmenting the change-type for recursive data types.
 *
 * If `T` contains recursive structure, two new change-types can be derived given `apply(x, dx)`:
 *  - The inner change: `DInner` is a path to a `T` inside `x`:
 *      `apply(x, dx: DInner) = access(x, dx)`.
 */
export abstract class AInner<
		DInner,
		A extends Apply<T, DT>,
		T = $T<A>,
		DT = $D<A>,
	>
	extends BaseApplyClass<T, DT | DInner>
	implements Apply<T, DT | DInner>
{
	declare readonly "~apply": {
		readonly value: T;
		readonly change: DT | DInner;
		readonly empty: A["~apply"]["empty"];
		readonly replace: A["~apply"]["replace"];
		readonly internal: A["~apply"]["internal"] | DInner;
	};
	constructor(readonly inner: A) {
		super(inner.empty);
	}

	// region Inner
	abstract isInnerChange(change: DT | DInner): change is DInner;

	abstract canApplyInner(value: T, inner: DInner): boolean;
	abstract applyInner(value: T, inner: DInner): T;

	abstract canApplyInnerOnChange(change: DT, inner: DInner): DT;
	abstract applyInnerOnChange(change: DT, inner: DInner): DT;

	abstract canCombineInner(d1: DInner, d2: DInner): boolean;
	abstract canCombineInnerLeft(d1: DInner, d2: DT): boolean;
	abstract canCombineInnerRight(d1: DT, d2: DInner): boolean;
	abstract combineInner(d1: DInner, d2: DInner): DT | DInner;
	abstract combineInnerLeft(d1: DInner, d2: DT): DT | DInner;
	abstract combineInnerRight(d1: DT, d2: DInner): DT | DInner;
	// endregion

	apply(value: T, change: DT | DInner): T {
		if (this.isInnerChange(change)) {
			return this.applyInner(value, change);
		}
		return this.inner.apply(value, change);
	}

	canApply(value: T, change: DT | DInner): boolean {
		if (this.isInnerChange(change)) {
			return this.canApplyInner(value, change);
		}
		return this.inner.canApply(value, change);
	}

	combine(d1: DT | DInner, d2: DT | DInner): DT | DInner {
		if (this.isInnerChange(d1)) {
			if (this.isInnerChange(d2)) {
				return this.combineInner(d1, d2);
			}
			return this.combineInnerLeft(d1, d2);
		}
		if (this.isInnerChange(d2)) {
			return this.combineInnerRight(d1, d2);
		}

		return this.combine(d1, d2);
	}

	override canCombine(d1: DT | DInner, d2: DT | DInner): boolean {
		if (this.isInnerChange(d1)) {
			if (this.isInnerChange(d2)) {
				return this.canCombineInner(d1, d2);
			}
			return this.canCombineInnerLeft(d1, d2);
		}
		if (this.isInnerChange(d2)) {
			return this.canCombineInnerRight(d1, d2);
		}

		return this.canCombine(d1, d2);
	}

	fromReplace(value: T) {
		return this.inner.fromReplace(value);
	}
	isReplace(change: DT | DInner): ReplaceOnly<T> | null {
		if (this.isInnerChange(change)) {
			return null;
		}
		return this.inner.isReplace(change as DT);
	}
	isEmpty(change: DT | DInner) {
		if (this.isInnerChange(change)) {
			return false;
		}
		return this.inner.isEmpty(change as DT);
	}
}
