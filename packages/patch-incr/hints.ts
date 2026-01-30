/**
 * Optimization hints for incremental functions.
 */

export const HINTS_EMPTY = 0;

/**
 * The `IF` has a trivial implementation and should not be memoized
 * to avoid the overhead of maintaining caches.
 */
export const HINT_TRIVIAL = 1;

/**
 * The `IF` is a constant function and can be optimized by constant folding.
 *
 * The `evaluate` MUST be effectively `(_x) => value` for a constant `value`.
 */
export const HINT_CONSTANT = 2;

/**
 * The `IF` is an identity function and can be simplified in function
 * compositions.
 *
 * The `evaluate` MUST be effectively `(x) => x`.
 */
export const HINT_IDENTITY = 4;

export interface HasHints {
	hints?: number;
}

export const isTrivial = ({ hints = 0 }: HasHints) =>
	(hints & HINT_TRIVIAL) !== 0;

export const isConstant = ({ hints = 0 }: HasHints) =>
	(hints & HINT_CONSTANT) !== 0;

export const isIdentity = ({ hints = 0 }: HasHints) =>
	(hints & HINT_IDENTITY) !== 0;
