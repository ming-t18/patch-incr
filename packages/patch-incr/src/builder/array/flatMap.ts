import type { IF } from "@/types";
import { compose, composeWithInv } from "../compose";
import { assocRight } from "../tuple";
import { concat } from "./concat";
import { map } from "./map";

export const flatMap = <Input, Output>(
	func: IF<Input, Output[]>,
): IF<Input[], [Output[], [number[], Output[][]]]> => {
	const composed = compose(map(func), concat());
	return composeWithInv(composed, assocRight());
};
