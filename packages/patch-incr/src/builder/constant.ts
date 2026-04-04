import type { IF, NoForwardOutput, Patches } from "@/types";
import { HINT_CONSTANT, HINT_TRIVIAL } from "../hints";

export const constant = <
	T,
	Input = unknown,
	InputChange = Patches<Input>,
	OutputChange = Patches<T>,
>(
	value: T,
	empty = [] as OutputChange,
): IF<Input, T, InputChange, OutputChange, NoForwardOutput> => {
	const forwardConstant = (_1: Input, _2: InputChange): OutputChange => empty;
	return {
		evaluate: (_: Input) => value,
		forward: forwardConstant,
		hints: HINT_CONSTANT | HINT_TRIVIAL,
	};
};
