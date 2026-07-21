import { getReplaceOnly, isReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import {
	type $A,
	type $D,
	type $T,
	type Apply,
	ApplyError,
	BaseApplyClass,
	type DRO,
	type ReplaceOnly,
} from "@/types";

/**
 * A combined stack operation.
 *
 * Represents the two following actions in sequence:
 * 1. Pop `toPop` elements
 * 2. Push all elements from `toPush`
 * 3. Apply all changes from `toApply` by index.
 *
 * Can also be expressed as a "splice" operation at end of the array.
 */
export interface ArrayStackOp<T, DT> {
	readonly toPush: readonly T[];
	readonly toPop: number;
	readonly toApply: readonly (readonly [number, DT])[];
}

export class AArrayStack<
		A extends Apply<T, DT>,
		T extends $A = $T<A>,
		DT extends $A = $D<A>,
	>
	extends BaseApplyClass<
		readonly T[],
		ArrayStackOp<T, DT> | DRO<readonly T[]>,
		null
	>
	implements Apply<readonly T[], ArrayStackOp<T, DT> | DRO<readonly T[]>>
{
	declare readonly "~apply": {
		readonly value: T[];
		readonly change: ArrayStackOp<T, DT> | DRO<readonly T[]>;
		readonly empty: null;
		readonly replace: ReplaceOnly<readonly T[]>;
		readonly internal: ArrayStackOp<T, DT>;
	};

	constructor(readonly inner: A) {
		super(null);
	}

	apply(
		value: readonly T[],
		change: DRO<readonly T[]> | ArrayStackOp<T, DT>,
	): readonly T[] {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly<readonly T[]>(change)) {
			return getReplaceOnly(change);
		}

		if (change.toPop > 0 && change.toPush.length > 0) {
			throw new Error("Invalid ArrayStackOp");
		}

		const value1 = [...value];
		if (change.toPop > 0) {
			value1.splice(value1.length - change.toPop);
		}
		value1.push(...change.toPush);

		for (const [i, dv] of change.toApply) {
			value1[i] = this.inner.apply(value[i] as T, dv);
		}
		return value1;
	}

	combine(
		left: DRO<readonly T[]> | ArrayStackOp<T, DT>,
		right: DRO<readonly T[]> | ArrayStackOp<T, DT>,
	): DRO<readonly T[]> | ArrayStackOp<T, DT> {
		if (left === null) {
			return right;
		}
		if (right === null) {
			return left;
		}
		if (isReplaceOnly<readonly T[]>(right)) {
			return right;
		}
		if (isReplaceOnly<readonly T[]>(left)) {
			return makeReplaceOnly(this.apply(getReplaceOnly(left), right));
		}

		const after = { ...left };
		if (right.toPop > 0) {
			// Pop from toPush elements first, then increment toPop
			if (right.toPop > left.toPush.length) {
				// Case 1: empty out toPush then increment toPop
				after.toPush = [];
				after.toPop = right.toPop - left.toPush.length;
			} else if (right.toPop === left.toPush.length) {
				// Case 2: empty out toPush exactly
				after.toPush = [];
			} else {
				// Case 3: pop elements from toPush
				after.toPush = left.toPush.slice(left.toPush.length - right.toPop);
			}
		}
		if (right.toPush.length > 0) {
			after.toPush = [...after.toPush, ...right.toPush];
		}
		// Apply the removals
		return after;
	}

	override canApply(
		value: readonly T[],
		change: ArrayStackOp<T, DT> | DRO<readonly T[]>,
	): boolean {
		try {
			this.apply(value, change);
			return true;
		} catch (e) {
			if (e instanceof ApplyError) {
				return false;
			}
			throw e;
		}
	}

	fromReplace(value: readonly T[]) {
		return makeReplaceOnly(value);
	}

	isReplace(rep: DRO<readonly T[]> | ArrayStackOp<T, DT>) {
		return isReplaceOnly(rep) ? rep : null;
	}

	isEmpty(change: DRO<readonly T[]> | ArrayStackOp<T, DT>): boolean {
		return change === null || (Array.isArray(change) && change.length === 0);
	}
}
