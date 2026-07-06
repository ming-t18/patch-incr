import { getReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import {
	type AnyApply,
	type Apply,
	BaseApplyClass,
	type InferApplyChange,
	type InferApplyValue,
	type ReplaceOnly,
} from "@/types";
import type { $D, $T } from "@/types/abbr";

/**
 * Creates a new `Apply` based on an existing `Apply`, except with the value-type
 * converted through a non-incremental isomorphism `map/unmap`.
 *
 * Beware: The internal representation of the change type uses the inner value
 * instead of the converted value.
 *
 * Often used for "wrappers" that do not introduce extra structure for the
 * change-type.
 */
export class AMapValue<A extends Apply<T0, DT0>, T, T0 = $T<A>, DT0 = $D<A>>
	extends BaseApplyClass<T, InferApplyChange<A>, A["empty"]>
	implements Apply<T, InferApplyChange<A>>
{
	declare readonly "~apply": {
		readonly value: T;
		readonly change: A["~apply"]["change"];
		readonly empty: A["~apply"]["empty"];
		readonly replace: A["~apply"]["replace"];
		readonly internal: A["~apply"]["internal"];
	};
	readonly $type = "mapValue";
	constructor(
		readonly inner: A,
		readonly map: (input: InferApplyValue<A>) => T,
		readonly unmap: (input: T) => InferApplyValue<A>,
	) {
		super(inner.empty, inner.structure);
	}

	isEmpty(value: InferApplyChange<A>) {
		return this.inner.isEmpty(value);
	}

	apply(value: T, change: InferApplyChange<A>): T {
		return this.map(this.inner.apply(this.unmap(value), change));
	}

	fromReplace(value: T): InferApplyChange<A> {
		return this.inner.fromReplace(this.unmap(value));
	}

	isReplace(change: InferApplyChange<A>): ReplaceOnly<T> | null {
		const res = this.inner.isReplace(change);
		if (res == null) {
			return null;
		}
		return makeReplaceOnly(this.map(getReplaceOnly(res)));
	}

	override canApply(value: T, change: InferApplyChange<A>): boolean {
		return this.inner.canApply(this.unmap(value), change);
	}

	combine(a: InferApplyChange<A>, b: InferApplyChange<A>): InferApplyChange<A> {
		return this.inner.combine(a, b);
	}

	override canCombine(a: InferApplyChange<A>, b: InferApplyChange<A>): boolean {
		return this.inner.canCombine(a, b);
	}
}

/**
 * Creats a new `Apply` that inherits the change-type but with a single-key
 * object wrapping the value.
 *
 * Let `x` be the value-type of the `inner`, then the value-type of the
 * `ASingleKey(key, inner)` is `{ [key]: x }` and the change-type stays
 * the same.
 *
 * This helper is recommended to avoid introducing any additional structure
 * to the change-type. (`{ [key]: x }` changing vs. `x` changing)
 *
 * @see {@link AMapValue}
 */
export class ASingleKey<
	K extends string | symbol,
	A extends AnyApply,
> extends AMapValue<A, Record<K, $T<A>>> {
	constructor(key: K, inner: A) {
		super(
			inner,
			(x) => ({ [key]: x }) as Record<K, $T<A>>,
			(y) => y[key],
		);
	}
}

/** @see {@link ASingleKey} */
export const singleKey = <K extends string | symbol, A extends AnyApply>(
	key: K,
	inner: A,
) => new ASingleKey(key, inner);
