import type { InferApplyType } from "patch-incr/algebra";
import { getReplaceOnly, isReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import type { Apply, InferApplyChange, ReplaceOnly } from "@/types";
import { UnionCaseError } from "@/union";

export function isReplaceUndefined(x: unknown): x is ReplaceOnly<undefined> {
	return isReplaceOnly(x) ? getReplaceOnly(x) === undefined : false;
}

export interface ApplyOptional$<
	A extends Apply<T, DT>,
	T = InferApplyType<A>,
	DT = InferApplyChange<A>,
> extends Apply<T | undefined, DT | ReplaceOnly<undefined>> {
	$type: "optional";
	inner: A;
	toUndefined: ReplaceOnly<undefined>;
}
export const optional = <
	A extends Apply<T, DT>,
	T = InferApplyType<A>,
	DT = InferApplyChange<A>,
>(
	a: A,
): ApplyOptional$<A, T, DT> => {
	return {
		$type: "optional",
		inner: a,
		toUndefined: makeReplaceOnly(undefined),
		apply: (
			value: T | undefined,
			change: DT | ReplaceOnly<undefined>,
		): T | undefined => {
			if (isReplaceOnly<T | undefined>(change)) {
				const res = getReplaceOnly<T | undefined>(change);
				return res;
			}
			if (value === undefined) {
				throw new UnionCaseError("non-undefined", "undefined");
			}
			return a.apply(value, change as DT);
		},
		fromReplace: (value: T | undefined): DT | ReplaceOnly<undefined> => {
			if (value === undefined) {
				return makeReplaceOnly(undefined);
			}

			return a.fromReplace(value);
		},
		isReplace: (
			change: DT | ReplaceOnly<undefined>,
		): ReplaceOnly<T | undefined> | null => {
			if (isReplaceOnly<T | undefined>(change)) {
				return change;
			}
			return a.isReplace(change);
		},
		empty: a.empty,
		combine: (
			d1: DT | ReplaceOnly<undefined>,
			d2: DT | ReplaceOnly<undefined>,
		): DT | ReplaceOnly<undefined> => {
			if (isReplaceUndefined(d2)) {
				return d2;
			}
			if (isReplaceUndefined(d1)) {
				throw new UnionCaseError("undefined", "non-undefined");
			}
			return a.combine(d1, d2);
		},
		isEmpty: (d: DT | ReplaceOnly<undefined>): boolean =>
			isReplaceUndefined(d) ? false : a.isEmpty(d),
	};
};
