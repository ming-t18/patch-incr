import type { IF } from "@/types";
import { OpKind, type OpMulti, type OpSingle } from "./types";

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
	func: IF<Input, Output>,
): OpSingle<Input, Output> => {
	const callable = (input: Input): Output => {
		if (isIIFNode(input)) {
			return makeP;
		}
		return func.evaluate(input);
	};
	return callable;
};
