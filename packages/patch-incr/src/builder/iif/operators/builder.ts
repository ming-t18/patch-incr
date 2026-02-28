import type { IF } from "@/types";
import { composeWith, isNode } from "../node";
import type { Operator } from "../types";

export const makeOpSingle = <Input, Output>(
	func: () => IF<Input, Output>,
): Operator<[Input], Output> => {
	const f = func();
	const opSingle = (input: Input): Output => {
		if (isNode<Input>(input)) {
			return composeWith(input, f) as Output;
		}
		return f.evaluate(input);
	};
	return opSingle;
};

export const makeOpSingleParam =
	<Args extends unknown[] = unknown[]>() =>
	<Input, Output>(func: (...args: Args) => IF<Input, Output>) =>
	(...args: Args): Operator<[Input], Output> => {
		const f = func(...args);
		const opSingle = (input: Input): Output => {
			if (isNode<Input>(input)) {
				return composeWith(input, f) as Output;
			}
			return f.evaluate(input);
		};
		return opSingle;
	};
