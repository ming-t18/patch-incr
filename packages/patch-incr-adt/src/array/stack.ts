import {
	getReplaceOnly,
	isDRO,
	isReplaceOnly,
	makeReplaceOnly,
} from "@/replaceOnly";
import {
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
 * 1. Ensure the input array's length is `expectedLength`
 * 2. Pop `toPop` elements
 * 3. Apply all changes from `toApply` by index.
 * 4. Push all elements from `toPush`
 *
 * The keys of `toApply` must be `0 <= ... < length - toPop`.
 * This ensures step (3) can be done before or after other steps while
 * preserving the same results.
 *
 * Can also be expressed as a "splice" operation at end of the array.
 *
 */
export interface ArrayStackOp<T, DT> {
	readonly expectedLength: number;
	readonly toPush: readonly T[];
	readonly toPop: number;
	readonly toApply: ReadonlyMap<number, DT>;
}

export type ArrayStack<T> = readonly T[];

export type DeriveArrayStackChange<T, DT> =
	| ArrayStackOp<T, DT>
	| DRO<readonly T[]>;

export class AArrayStack<A extends Apply<T, DT>, T = $T<A>, DT = $D<A>>
	extends BaseApplyClass<
		readonly T[],
		ArrayStackOp<T, DT> | DRO<readonly T[]>,
		null
	>
	implements Apply<readonly T[], ArrayStackOp<T, DT> | DRO<readonly T[]>>
{
	declare readonly "~apply": {
		readonly value: readonly T[];
		readonly change: ArrayStackOp<T, DT> | DRO<readonly T[]>;
		readonly empty: null;
		readonly replace: ReplaceOnly<readonly T[]>;
		readonly internal: ArrayStackOp<T, DT>;
	};

	constructor(readonly inner: A) {
		super(null);
	}

	/** Determine the min. length of the target array this can apply to. */
	getMinLength(change: DRO<readonly T[]> | ArrayStackOp<T, DT>): number {
		if (isDRO<readonly T[]>(change)) {
			return 0;
		}

		return change.expectedLength - change.toPop;
	}

	getNewExpectedLength(dx: ArrayStackOp<T, DT>): number {
		return dx.expectedLength - dx.toPop + dx.toPush.length;
	}

	/**
	 * If `n` new elements are prepended (`.unshift`) to the input array (`[...nElems, ...array]`),
	 * adjust the `dx` accordingly so the same change can be applied on the shifted array.
	 */
	unshiftTransform(n: number, dx: ArrayStackOp<T, DT>): ArrayStackOp<T, DT> {
		const toApply1 = new Map<number, DT>();
		for (const [i, d] of dx.toApply) {
			toApply1.set(i + n, d);
		}
		return {
			expectedLength: dx.expectedLength + n,
			toApply: toApply1,
			toPop: dx.toPop,
			toPush: dx.toPush,
		};
	}

	canDoShiftTransform(n: number, dx: ArrayStackOp<T, DT>): boolean {
		return dx.expectedLength - dx.toPop - n >= 0;
	}

	/**
	 * If `n` elements are removed from the beginning to the input array (`array.slice(n)`),
	 * adjust the `dx` accordingly so the same change can be applied on the shifted array.
	 */
	shiftTransform(n: number, dx: ArrayStackOp<T, DT>): ArrayStackOp<T, DT> {
		if (dx.expectedLength - dx.toPop - n < 0) {
			throw new ApplyError("truncation would underflow");
		}
		const toApply1 = new Map<number, DT>();
		for (const [i, d] of dx.toApply) {
			if (i - n >= 0) {
				toApply1.set(i - n, d);
			}
		}
		return {
			expectedLength: dx.expectedLength - n,
			toApply: toApply1,
			toPop: dx.toPop,
			toPush: dx.toPush,
		};
	}

	noop(expectedLength: number): ArrayStackOp<T, DT> {
		return {
			expectedLength,
			toApply: new Map(),
			toPop: 0,
			toPush: [],
		};
	}

	modify(expectedLength: number, entries: Iterable<readonly [number, DT]>) {
		return {
			expectedLength,
			toApply: new Map(entries),
			toPop: 0,
			toPush: [],
		};
	}

	spliceEnd(
		expectedLength: number,
		toPop: number,
		toPush: readonly T[],
	): ArrayStackOp<T, DT> {
		return {
			expectedLength,
			toApply: new Map(),
			toPop,
			toPush,
		};
	}

	push(expectedLength: number, toPush: readonly T[]): ArrayStackOp<T, DT> {
		return {
			expectedLength,
			toApply: new Map(),
			toPop: 0,
			toPush,
		};
	}

	clear(expectedLength: number): ArrayStackOp<T, DT> {
		return {
			expectedLength,
			toApply: new Map(),
			toPop: expectedLength,
			toPush: [],
		};
	}

	pop(expectedLength: number, toPop: number): ArrayStackOp<T, DT> {
		return {
			expectedLength,
			toApply: new Map(),
			toPop,
			toPush: [],
		};
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

		if (value.length !== change.expectedLength) {
			throw new ApplyError("expectedLength check failed");
		}

		const value1: T[] = [...value];
		if (change.toPop > 0) {
			value1.splice(value1.length - change.toPop);
		}
		value1.push(...change.toPush);

		const indexCeil = value.length - change.toPop;
		if (indexCeil < 0) {
			throw new ApplyError("stack underflow");
		}
		for (const [i, dv] of change.toApply) {
			if (i >= indexCeil) {
				throw new ApplyError("internal change index out of bounds");
			}
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

		const len1 = left.expectedLength - left.toPop + left.toPush.length;
		if (len1 !== right.expectedLength) {
			throw new ApplyError("combine: expectedLength mismatch");
		}

		const after = { ...left };
		if (right.toPop > 0) {
			// Pop from toPush elements first, then increment toPop
			if (right.toPop > left.toPush.length) {
				// Case 1: empty out toPush then increment toPop
				after.toPush = [];
				after.toPop += right.toPop - left.toPush.length;
			} else if (right.toPop === left.toPush.length) {
				// Case 2: empty out toPush exactly
				after.toPush = [];
			} else {
				// Case 3: pop elements from toPush
				after.toPush = left.toPush.slice(0, left.toPush.length - right.toPop);
			}
		}
		if (right.toPush.length > 0) {
			after.toPush = [...after.toPush, ...right.toPush];
		}

		const minIndex = after.expectedLength - after.toPop;
		const map1 = new Map<number, DT>();
		const toPush1 = [...after.toPush];
		// Overwritten due to array pops from right side
		const lenOverwritten = right.expectedLength - right.toPop;
		for (const [i, d] of left.toApply) {
			if (i >= lenOverwritten) {
				continue;
			}
			if (i < minIndex) {
				map1.set(i, d);
			} else {
				const i1 = i - minIndex;
				toPush1[i1] = this.inner.apply(toPush1[i1] as T, d);
			}
		}
		for (const [i, d] of right.toApply) {
			if (i < minIndex) {
				if (map1.has(i)) {
					map1.set(i, this.inner.combine(map1.get(i) as DT, d));
				} else {
					map1.set(i, d);
				}
			} else {
				const i1 = i - minIndex;
				toPush1[i1] = this.inner.apply(toPush1[i1] as T, d);
			}
		}
		after.toApply = map1;
		after.toPush = toPush1;
		return after;
	}

	override canApply(
		value: readonly T[],
		change: ArrayStackOp<T, DT> | DRO<readonly T[]>,
	): boolean {
		if (isDRO(change)) {
			return true;
		}
		if (change.expectedLength !== value.length) {
			return false;
		}

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
		if (change === null) {
			return true;
		}
		if (isReplaceOnly(change)) {
			return false;
		}
		return (
			change.toApply.size === 0 &&
			change.toPop === 0 &&
			change.toPush.length === 0
		);
	}
}

export const arrayStack = <A extends Apply<T, DT>, T = $T<A>, DT = $D<A>>(
	apply: A,
) => new AArrayStack<A, T, DT>(apply);
