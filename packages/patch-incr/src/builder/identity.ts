import { HINT_IDENTITY, HINT_TRIVIAL } from "@/hints";
import type { IFInv, Patches } from "@/types";

const _identity = <T>(x: T) => x;

export const identity = <Input, Change = Patches<Input>>(): IFInv<
	Input,
	Input,
	Change,
	Change
> => {
	return {
		evaluate: _identity,
		inverseEvaluate: _identity,
		forward: (_1, d) => d,
		hints: HINT_IDENTITY | HINT_TRIVIAL,
	};
};
