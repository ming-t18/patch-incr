import { getReplaceOnly } from "@/replaceOnly";
import type { $A, $D, $T } from "../abbr";
import type { Evaluate } from "./incrFunc";

export const makeForward =
	<A extends $A, B extends $A, DASub = $D<A>>(
		input: A,
		output: B,
		{
			evaluate,
			forward,
		}: {
			evaluate: Evaluate<A, B>;
			forward: (x: $T<A>, dx: DASub, y: $T<B>) => $D<B>;
		},
	) =>
	(x: $T<A>, dx: $D<A>, y: $T<B>): $D<B> => {
		if (input.isEmpty(dx)) {
			return output.empty;
		}
		const rep = input.isReplace(dx);
		if (rep !== null) {
			return output.fromReplace(evaluate(getReplaceOnly(rep)));
		}

		return forward(x, dx as DASub, y);
	};

export const makeForwardA =
	<A extends $A, B extends $A, DASub = $D<A>>(
		input: A,
		output: B,
		{
			evaluate,
			forward,
		}: {
			evaluate: Evaluate<A, B>;
			forward: (x: $T<A>, dx: DASub) => $D<B>;
		},
	) =>
	(x: $T<A>, dx: $D<A>): $D<B> => {
		if (input.isEmpty(dx)) {
			return output.empty;
		}
		const rep = input.isReplace(dx);
		if (rep !== null) {
			return output.fromReplace(evaluate(getReplaceOnly(rep)));
		}

		return forward(x, dx as DASub);
	};
