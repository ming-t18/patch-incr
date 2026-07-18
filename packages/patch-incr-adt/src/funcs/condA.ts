import type { $A, IFA, InferApplyValue } from "@/types";
import { makeIFA, REEVAL } from "./helpers";

/**
 * The `if/then/else` conditional for `IFA`.
 *
 * The condition is a non-incremental function that's re-evaluated in `fowrad`.
 */

export const condA = <A extends $A, B extends $A>(
	pred: (value: InferApplyValue<A>) => boolean,
	fLeft: IFA<A, B>,
	fRight: IFA<A, B>,
	input = fLeft.input,
	output = fLeft.output,
): IFA<A, B> =>
	makeIFA(input, output, {
		evaluate: (x) => (pred(x) ? fLeft.evaluate(x) : fRight.evaluate(x)),
		forward: (x, dx) => {
			const x1 = fLeft.input.apply(x, dx);
			const p0 = pred(x);
			const p1 = pred(x1);
			if (p0 !== p1) {
				return REEVAL;
			}
			return p0 ? fLeft.forward(x, dx) : fRight.forward(x, dx);
		},
	});
