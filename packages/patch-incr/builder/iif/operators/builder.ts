import type { IF } from "@/types";
import { composeWith, isNode } from "../node";
import { OpKind, type OpMulti, type OpSingle } from "../types";

export function isOpSingle<Input, Output>(
	value: unknown,
): value is OpSingle<Input, Output> {
	return (
		typeof value === "function" &&
		"opKind" in value &&
		(value as OpSingle<Input, Output>).opKind === OpKind.Single
	);
}

export function isOpMulti<Inputs extends unknown[], Output>(
	value: unknown,
): value is OpMulti<Inputs, Output> {
	return (
		typeof value === "function" &&
		"opKind" in value &&
		(value as OpMulti<Inputs, Output>).opKind === OpKind.Multi
	);
}

export const makeOpSingle = <Input, Output>(
	func: () => IF<Input, Output>,
): OpSingle<Input, Output> => {
	const f = func();
	const opSingle = (input: Input): Output => {
		if (isNode<Input>(input)) {
			return composeWith(input, f) as Output;
		}
		return f.evaluate(input);
	};
	opSingle.opKind = OpKind.Single;
	return opSingle as OpSingle<Input, Output>;
};

export const makeOpSingleParam =
	<Args extends unknown[] = unknown[]>() =>
	<Input, Output>(func: (...args: Args) => IF<Input, Output>) =>
	(...args: Args): OpSingle<Input, Output> => {
		const f = func(...args);
		const opSingle = (input: Input): Output => {
			if (isNode<Input>(input)) {
				return composeWith(input, f) as Output;
			}
			return f.evaluate(input);
		};
		opSingle.opKind = OpKind.Single;
		return opSingle as OpSingle<Input, Output>;
	};
