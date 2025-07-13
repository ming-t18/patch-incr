import type { IF } from "../types";

export const groupBy = <Input, Key extends string = string>(
	getKey: (input: Input) => Key,
): IF<Input[], Record<Key, Input[]>> => {
	const _evaluateGroupBuy = (xs: Input[]) =>
		Object.groupBy(xs, (x) => getKey(x));
	throw new Error("TODO");
};
