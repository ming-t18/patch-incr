import type { AEither, Either, Right } from "@/either";
import { makeIFR, REEVAL } from "@/funcs/helpers";
import type { APair } from "@/pair";
import type { $A, $T, Evaluate, IFA, IFR } from "@/types";
import { type AAtomic, atomic } from "..";

/**
 * Repeatedly applies `func` until the result is a `Left`.
 * The residual is the number of iterations taken.
 *
 * This function appears in reversible computing, due to the property
 * `inverse (trace f) = trace (inverse f)`.
 * This function is called `trace` due to it being represented in category theory.
 *
 * In Haskell arrows, the "loop" does something similar, except it relies on the fixed point.
 */
export const trace = <A extends $A, B extends $A, C extends $A>(
	func: IFA<AEither<A, C>, AEither<B, C>>,
): IFR<A, B, AAtomic<number>> => {
	const evaluate: Evaluate<A, APair<B, AAtomic<number>>> = (input) => {
		let state: Either<B, C> = func.evaluate({ left: input });
		let iters = 0;
		while ("right" in state) {
			iters++;
			state = func.evaluate(state satisfies Right<$T<C>>);
		}
		return [state.left, iters] as [$T<B>, number];
	};
	const input = func.input.shape.left.inner;
	const retType = func.output.shape.left.inner;
	return makeIFR(input, retType, atomic<number>(), {
		evaluate,
		forward: (x, dx, [_, itersLast]) => {
			const in0 = { left: x };
			let state = func.evaluate(in0);
			let dState = func.forward(in0, dx);
			let iters = 0;
			while ("right" in state) {
				iters++;
				const stateIn = state satisfies Right<$T<C>>;
				state = func.evaluate(stateIn);
				dState = func.forward(stateIn, dState);
			}
			if (iters === itersLast) {
				return [dState, null];
			} else {
				return REEVAL;
			}
		},
	});
};
