import type { InferApplyType } from "patch-incr/algebra";
import { getReplaceOnly, isReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import type { Apply, InferApplyChange, ReplaceOnly } from "@/types";
import { UnionCaseError } from "@/union";

export function isReplaceUndefined(x: unknown): x is ReplaceOnly<undefined> {
	return isReplaceOnly(x) ? getReplaceOnly(x) === undefined : false;
}

export interface Optional$<
	A extends Apply<T, DT>,
	T = InferApplyType<A>,
	DT = InferApplyChange<A>,
> extends Apply<T | undefined, DT | ReplaceOnly<undefined>> {
	$type: "optional";
	inner: A;
	toUndefined: ReplaceOnly<undefined>;
}

export class AOptional<
	A extends Apply<T, DT>,
	T = InferApplyType<A>,
	DT = InferApplyChange<A>,
> implements Optional$<A, T, DT>
{
	declare readonly "~apply": {
		readonly value: T | undefined;
		readonly change: ReplaceOnly<undefined> | DT;
	};

	readonly $type = "optional";
	readonly toUndefined = makeReplaceOnly(undefined);
	readonly empty;
	constructor(readonly inner: A) {
		this.empty = inner.empty;
	}

	apply(
		value: T | undefined,
		change: DT | ReplaceOnly<undefined>,
	): T | undefined {
		if (isReplaceOnly<T | undefined>(change)) {
			const res = getReplaceOnly<T | undefined>(change);
			return res;
		}
		if (value === undefined) {
			throw new UnionCaseError("non-undefined", "undefined");
		}
		return this.inner.apply(value, change as DT);
	}

	fromReplace(value: T | undefined): DT | ReplaceOnly<undefined> {
		if (value === undefined) {
			return makeReplaceOnly(undefined);
		}

		return this.inner.fromReplace(value);
	}

	isReplace(
		change: DT | ReplaceOnly<undefined>,
	): ReplaceOnly<T | undefined> | null {
		if (isReplaceOnly<T | undefined>(change)) {
			return change;
		}
		return this.inner.isReplace(change);
	}

	combine(
		d1: DT | ReplaceOnly<undefined>,
		d2: DT | ReplaceOnly<undefined>,
	): DT | ReplaceOnly<undefined> {
		if (isReplaceUndefined(d2)) {
			return d2;
		}
		if (isReplaceUndefined(d1)) {
			throw new UnionCaseError("undefined", "non-undefined");
		}
		return this.inner.combine(d1, d2);
	}

	isEmpty(d: DT | ReplaceOnly<undefined>): boolean {
		return isReplaceUndefined(d) ? false : this.inner.isEmpty(d);
	}
}

export const optional = <
	A extends Apply<T, DT>,
	T = InferApplyType<A>,
	DT = InferApplyChange<A>,
>(
	inner: A,
) => new AOptional<A, T, DT>(inner);
