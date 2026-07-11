import { deepEquals } from "bun";
import { fromIFA } from "@/funcs";
import type { $A, $D, $T } from "@/types/abbr";
import type { IF1, IFA } from "@/types/func";
import type { Eq } from "./change";

/**
 * Patch-coherence properties for IF. Ensures an incremental function `f`
 * is a functor between two categories, `f : A -> B` where `A, B` are
 * categories with values as objects and changes between them as morphisms.
 *
 * Patch equality is not checked. Instead, two patches are considered
 * to be equal by comparing the outputs after applying them on a particular input.
 *
 * However, `isEmpty` is checked on properties that rely on empty patches.
 */
export interface PropsIF<A extends $A, _B extends $A> {
	/**
	 * `f'(empty) = empty`
	 *
	 * The functor property on the identity morphism.
	 *
	 * `output.isEmpty(f.forward(x, input.empty)) === true`
	 */
	forwardEmptyIsEmpty: (x: $T<A>) => boolean;
	/**
	 * `f'(x @ dx) = f(x) @ f'(dx)`
	 *
	 * The functor property for an incremental function.
	 *
	 * ```typescript
	 * const y = f.evaluate(x);
	 * const dy = f.forward(x, dx, y);
	 * // where === is a way to determine if two inputs are equal
	 * f.evaluate(f.input.apply(x, dx)) === f.output.apply(y, dy)
	 * ```
	 * */
	forwardSingle: (x: $T<A>, dx: $D<A>) => boolean;
	/**
	 * `f(x) @ f'(dx1 <> dx2) = f(x) @ (f'(dx1) <> f'(dx2))`
	 *
	 * The functor property for an incremental function under patch composition.
	 */
	forwardCompose: (x: $T<A>, dx1: $D<A>, dx2: $D<A>) => boolean;
}

export const makePropsIF = <A extends $A, B extends $A>(
	func: IF1<A, B>,
	outputEq = deepEquals as Eq<$T<B>>,
): PropsIF<A, B> => {
	const { input, output } = func;
	return {
		forwardEmptyIsEmpty: (x) => {
			const dy = func.forward(x, input.empty, func.evaluate(x));
			return output.isEmpty(dy);
		},
		forwardSingle: (x, dx) => {
			//    dx
			// x ---> x1
			// |      |
			// v      v
			// y ---> y1
			//    dy
			const y = func.evaluate(x);
			const y1 = func.evaluate(input.apply(x, dx));
			const dy = func.forward(x, dx, y);
			return outputEq(y1, output.apply(y, dy));
		},
		forwardCompose: (x, dx1, dx2) => {
			// x --> x1 --> x2
			// |     |      |
			// v     v      v
			// y --> y1 --> y2
			const y = func.evaluate(x);
			const x1 = input.apply(x, dx1);
			const dy1 = func.forward(x, dx1, y);
			const y1 = func.evaluate(x1);
			const y2 = func.evaluate(input.apply(x1, dx2));
			const dy2 = func.forward(x1, dx2, y1);
			return outputEq(y2, output.apply(y, output.combine(dy1, dy2)));
		},
	};
};

export const makePropsIFA = <A extends $A, B extends $A>(
	func: IFA<A, B>,
	outputEq = deepEquals as Eq<$T<B>>,
): PropsIF<A, B> => makePropsIF(fromIFA(func), outputEq);
