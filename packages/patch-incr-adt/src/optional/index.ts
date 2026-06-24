import { getReplaceOnly, isReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import {
	type Apply,
	BaseApplyClass,
	type InferApplyChange,
	type InferApplyValue,
	type ReplaceOnly,
} from "@/types";
import { UnionCaseError } from "@/union";

export function isReplaceUndefined(x: unknown): x is ReplaceOnly<undefined> {
	return isReplaceOnly(x) ? getReplaceOnly(x) === undefined : false;
}

export interface Optional$<
	A extends Apply<T, DT>,
	T = InferApplyValue<A>,
	DT = InferApplyChange<A>,
> extends Apply<T | undefined, DT | ReplaceOnly<undefined>> {
	$type: "optional";
	inner: A;
	toUndefined: ReplaceOnly<undefined>;
}

export class AOptional<
		A extends Apply<T, DT>,
		T = InferApplyValue<A>,
		DT = InferApplyChange<A>,
	>
	extends BaseApplyClass<T | undefined, DT | ReplaceOnly<undefined>, A["empty"]>
	implements Optional$<A, T, DT>
{
	declare readonly "~apply": {
		readonly value: T | undefined;
		readonly change: ReplaceOnly<undefined> | DT;
	};

	readonly $type = "optional";
	readonly toUndefined = makeReplaceOnly(undefined);
	constructor(readonly inner: A) {
		super(inner.empty);
	}

	apply(
		value: T | undefined,
		change: DT | ReplaceOnly<undefined>,
	): T | undefined {
		if (isReplaceUndefined(change)) {
			return undefined;
		}
		if (value === undefined) {
			if (this.inner.isEmpty(change)) {
				return value;
			}
			const rep = this.inner.isReplace(change);
			if (rep !== null) {
				return getReplaceOnly(rep);
			}

			throw new UnionCaseError("non-undefined", "undefined");
		}
		return this.inner.apply(value, change);
	}

	override canApply(
		value: T | undefined,
		change: DT | ReplaceOnly<undefined>,
	): boolean {
		if (isReplaceUndefined(change)) {
			return true;
		}
		if (value === undefined) {
			return (
				this.inner.isEmpty(change) || this.inner.isReplace(change) !== null
			);
		}
		return this.inner.canApply(value, change);
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
			if (this.inner.isEmpty(d2)) {
				return d1;
			}
			const rep = this.inner.isReplace(d2);
			if (rep !== null) {
				return d2;
			}
			throw new UnionCaseError("undefined", "non-undefined");
		}
		return this.inner.combine(d1, d2);
	}

	override canCombine(
		d1: DT | ReplaceOnly<undefined>,
		d2: DT | ReplaceOnly<undefined>,
	): boolean {
		if (isReplaceUndefined(d2)) {
			return true;
		}
		if (isReplaceUndefined(d1)) {
			return this.inner.isEmpty(d2) || this.inner.isReplace(d2) !== null;
		}
		return this.inner.canCombine(d1, d2);
	}

	isEmpty(d: DT | ReplaceOnly<undefined>): boolean {
		return isReplaceUndefined(d) ? false : this.inner.isEmpty(d);
	}
}

export const optional = <
	A extends Apply<T, DT>,
	T = InferApplyValue<A>,
	DT = InferApplyChange<A>,
>(
	inner: A,
) => new AOptional<A, T, DT>(inner);
