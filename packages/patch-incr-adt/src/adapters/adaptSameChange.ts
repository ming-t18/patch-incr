import { getReplaceOnly, isReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import type { Apply, DRO } from "@/types/algebra";

/**
 * Base class for creating an `Apply` for new value type
 * that shares the change type of another `Apply`.
 *
 * The methods `apply, fromReplace, isReplace` must be implemented
 * for the new type, while other methods of `Apply` are carried over as-is.
 *
 * IMPORTANT: `inner.combine` cannot return a replace-change or else this
 * adapter will raise `TypeError` on `combine`.
 *
 * @param A The new value type
 * @param DA The shared change type
 * @param A0 The existing value type
 * @param Apply0 The existing instance of `Apply<A0, DA>`
 */
export class AdaptSameChange<
	A,
	DA,
	A0,
	Apply0 extends Apply<A0, DA> = Apply<A0, DA>,
> implements Apply<A, Exclude<DA, DRO<A0>> | DRO<A>>
{
	public constructor(
		readonly inner: Apply0,
		readonly applyChange: (value: A, change: Exclude<DA, DRO<A0>>) => A,
		readonly empty: Exclude<DA, DRO<A0>> | DRO<A> = null,
	) {}

	fromReplace(value: A) {
		return makeReplaceOnly(value);
	}

	apply(value: A, change: Exclude<DA, DRO<A0>> | DRO<A>): A {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly(change)) {
			return getReplaceOnly(change);
		}
		return this.applyChange(value, change);
	}

	isReplace(change: Exclude<DA, DRO<A0>> | DRO<A>): DRO<A> {
		return isReplaceOnly(change) ? change : null;
	}

	isEmpty(change: Exclude<DA, DRO<A0>> | DRO<A>): boolean {
		return change === null;
	}

	combine(
		a: Exclude<DA, DRO<A0>> | DRO<A>,
		b: Exclude<DA, DRO<A0>> | DRO<A>,
	): Exclude<DA, DRO<A0>> | DRO<A> {
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
		const combined: DA = this.inner.combine(a, b);
		if (isReplaceOnly(combined)) {
			throw new TypeError(
				"AdaptSameChange::combine(non-replace, non-replace): combined is replace only which cannot be converted",
			);
		}
		return combined as Exclude<DA, DRO<A0>>;
	}
}

export const adaptSameChange = <
	A,
	DA,
	A0,
	Apply0 extends Apply<A0, DA> = Apply<A0, DA>,
>({
	inner,
	apply,
}: {
	inner: Apply0;
	apply: (value: A, change: Exclude<DA, DRO<A0>>) => A;
}) => new AdaptSameChange<A, DA, A0, Apply0>(inner, apply);
