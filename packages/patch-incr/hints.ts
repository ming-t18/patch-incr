/**
 * Optimization hints for incremental functions.
 */

/** The default: No optimization hints. */
export const HINTS_EMPTY = 0;

/**
 * The `IF` has a trivial implementation and should not be memoized
 * to avoid the overhead of maintaining caches.
 *
 * Note that the composition between two trivial functions is NOT
 * a trivial function, unless explicitly specified.
 */
export const HINT_TRIVIAL = 1;

/**
 * The `IF` is a constant function and can be optimized by constant folding.
 *
 * Other `IF` constructed based on constant functions are constant as well.
 *
 * The `evaluate` MUST be effectively `constant(x)` for some `x`.
 */
export const HINT_CONSTANT = 2;

/**
 * The `IF` is an identity function and can be simplified in function
 * compositions.
 *
 * The `evaluate` and `forward` MUST be equivalent to `identity()`.
 */
export const HINT_IDENTITY = 4;

export interface HasHints {
	hints?: number;
}

/** @see HINT_TRIVIAL */
export const isTrivial = ({ hints = 0 }: HasHints) =>
	(hints & HINT_TRIVIAL) !== 0;

/** @see HINT_CONSTANT */
export const isConstant = ({ hints = 0 }: HasHints) =>
	(hints & HINT_CONSTANT) !== 0;

/** @see HINT_IDENTITY */
export const isIdentity = ({ hints = 0 }: HasHints) =>
	(hints & HINT_IDENTITY) !== 0;
