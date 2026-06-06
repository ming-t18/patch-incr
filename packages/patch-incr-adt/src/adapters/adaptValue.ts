import type { Apply, ReplaceOnly } from "@/types/algebra";

/**
 * Base class for creating an `Apply` for an existing value type
 * but with a different change type through a round-trip
 * conversion `(convertChange, uncovertChange)`.
 *
 * @param A The value type
 * @param DA The new change type
 * @param DA0 The existing change type
 * @param Apply0 The existing instance of `Apply<A, DA0>`
 */
export class AdaptConvertChange<
	A,
	DA,
	DA0,
	Apply0 extends Apply<A, DA0> = Apply<A, DA0>,
> implements Apply<A, DA>
{
	public constructor(
		readonly inner: Apply0,
		readonly empty: DA,
		readonly convertChange: (change: DA) => DA0,
		readonly unconvertChange: (change: DA0) => DA,
	) {}

	apply(value: A, change: DA) {
		return this.inner.apply(value, this.convertChange(change));
	}

	fromReplace(value: A): DA {
		return this.unconvertChange(this.inner.fromReplace(value));
	}

	isReplace(d: DA): ReplaceOnly<A> | null {
		return this.inner.isReplace(this.convertChange(d));
	}

	isEmpty(d: DA): boolean {
		return this.inner.isEmpty(this.convertChange(d));
	}

	combine(d1: DA, d2: DA): DA {
		return this.unconvertChange(
			this.inner.combine(this.convertChange(d1), this.convertChange(d2)),
		);
	}
}

export const adaptConvertChange = <
	A,
	DA,
	DA0,
	Apply0 extends Apply<A, DA0> = Apply<A, DA0>,
>({
	inner,
	empty,
	convertChange,
	unconvertChange,
}: {
	inner: Apply0;
	empty: DA;
	convertChange: (change: DA) => DA0;
	unconvertChange: (change: DA0) => DA;
}) =>
	new AdaptConvertChange<A, DA, DA0, Apply0>(
		inner,
		empty,
		convertChange,
		unconvertChange,
	);
