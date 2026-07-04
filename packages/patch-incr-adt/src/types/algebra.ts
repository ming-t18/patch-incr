import type { DRO, ReplaceOnly } from "@/types/replaceOnly";

export type { DRO, ReplaceOnly } from "@/types/replaceOnly";

export type Defined<T> = T extends undefined
	? never
	: T extends null
		? never
		: T;

export type Writable<T> = { [k in keyof T]: T[k] };

/**
 * Base error class for invalid `combine` or `apply` operations.
 * Examples: Union case mismatch, array index out of bounds.
 */
export class ApplyError extends Error {}

export interface Monoid<in out M> {
	readonly empty: M;
	/**
	 * Combines two changes into a single change. Must follow the properties of monoid.
	 * @throws ApplyError for changes that cannot be combined.
	 */
	readonly combine: (a: M, b: M) => M;
	/** Determines of two changes can be combined without error. */
	readonly canCombine: (a: M, b: M) => boolean;
	/**
	 * Quickly determines if a change is empty on all inputs.
	 * Does not have to perform a deep analysis on the entire change.
	 * `isEmpty(empty)` must be true.
	 * */
	readonly isEmpty: (value: M) => boolean;
}

export interface Group<in out M> extends Monoid<M> {
	readonly inverse: (a: M) => M;
}

export interface Change<in out T, in out DT> extends Monoid<DT> {
	readonly fromReplace: (value: T) => DT;
	readonly isReplace: (value: DT) => ReplaceOnly<T> | null;
}

export interface BaseApply<TypeTag extends string = string> {
	/**
	 * The type tag for an `Apply`.
	 *  - constant
	 *  - atomic
	 *  - record
	 *  - product
	 *  - union
	 *  - optional
	 *  - map
	 */
	$type: TypeTag;
}

/** A change-type applier. */
export interface Apply<in out T, in out DT = DRO<T>> extends Change<T, DT> {
	/**
	 * Object containing the related types of this instance of `Apply`,
	 * including the value and change types.
	 * Does not actually exist at runtime.
	 */
	readonly "~apply": {
		/** The value-type. */
		readonly value: T;
		/** The change-type. */
		readonly change: DT;
		/** Narrowed empty type when `isEmpty` is true. */
		readonly empty: DT;
		/** Narrowed replace type when `isReplace` is non-null. */
		readonly replace: DT;
		/** Narrowed internal change type when `isEmpty` is false and `isReplace` is null. */
		readonly internal: DT;
	};
	readonly structure: ApplyStructure;
	/** Applies the patch on an object. */
	readonly apply: (value: T, change: DT) => T;
	/** If this method is defined, determines if the patch is applicable given a value. */
	readonly canApply: (value: T, change: DT) => boolean;
}

/** An enum describing the structure of an `Apply` */
export enum ApplyStructure {
	/** The value-type is empty. (aka never, null) */
	Zero = "Zero",
	/** The value-type has only 1 element. (aka singleton, unit) */
	One = "One",
	/** The change-type has only zero or one elements. */
	Atomic = "Atomic",
	/**
	 * The change-type between any two values can have any number of elements.
	 * Also the default `ApplyStructure`.
	 */
	Complex = "Complex",
}

export abstract class BaseApplyClass<T, DT, DTEmpty extends DT = DT> {
	constructor(
		readonly empty: DTEmpty,
		readonly structure = ApplyStructure.Complex,
	) {}

	getEmpty(): DTEmpty {
		return this.empty;
	}

	abstract canApply(_value: T, _change: DT): boolean;
	abstract combine(a: DT, b: DT): DT;

	canCombine(a: DT, b: DT): boolean {
		try {
			this.combine(a, b);
			return true;
		} catch {
			return false;
		}
	}
}

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyApply = Apply<any, any>;
// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyApplyOf<T> = Apply<T, any>;

export type InferApplyValue<A extends AnyApply> = A["~apply"]["value"];
// A extends AnyApply ? A["~apply"]["value"] : never;

export type InferApplyChange<A extends AnyApply> = A["~apply"]["change"];
// A extends AnyApply ? A["~apply"]["change"] : never;

export type infer<A extends AnyApply> = InferApplyValue<A>;
export type inferChange<A extends AnyApply> = InferApplyChange<A>;
