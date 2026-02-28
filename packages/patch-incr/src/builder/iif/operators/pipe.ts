import type { IF } from "@/types";
import { composeWith, isNode } from "../node";
import type { Operator } from "../types";

export const pipe = <Input extends WeakKey, Output>(
	func: IF<Input, Output>,
): Operator<[Input], Output> => {
	const pipeOp = (input: Input): Output => {
		if (isNode<Input>(input)) {
			return composeWith(input, func) as Output;
		}
		return func.evaluate(input);
	};
	return pipeOp;
};
