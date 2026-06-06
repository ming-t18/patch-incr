import type { Apply, ReplaceOnly } from "@/types/algebra";

/**
 * Base class for acreating an `Apply` for new value type
 * that shares the change type of another `Apply`.
 *
 * The methods `apply, fromReplace, isReplace` must be implemented
 * for the new type, while other methods of `Apply` are carried over as-is.
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
> implements Apply<A, DA>
{
	public constructor(
		readonly inner: Apply0,
		readonly apply: (value: A, change: DA) => A,
		readonly fromReplace: (value: A) => DA,
		readonly isReplace: (d: DA) => ReplaceOnly<A> | null,
		// Copied from existing
		readonly empty: DA = inner.empty,
		readonly combine: (a: DA, b: DA) => DA = inner.combine,
		readonly isEmpty: (value: DA) => boolean = inner.isEmpty,
	) {}
}

export const adaptSameChange = <
	A,
	DA,
	A0,
	Apply0 extends Apply<A0, DA> = Apply<A0, DA>,
>({
	inner,
	apply,
	fromReplace,
	isReplace,
}: {
	inner: Apply0;
	apply: (value: A, change: DA) => A;
	fromReplace: (value: A) => DA;
	isReplace: (d: DA) => ReplaceOnly<A> | null;
}) => {
	return new AdaptSameChange<A, DA, A0, Apply0>(
		inner,
		apply,
		fromReplace,
		isReplace,
	);
};
