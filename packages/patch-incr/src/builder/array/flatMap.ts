import type { IF } from "@/types";
import { compose, composeMemo, composeWithInv } from "../compose";
import { fst } from "../pair";
import { assocRight } from "../tuple";
import { concat } from "./concat";
import { map } from "./map";

export const flatMap = <Input, Output>(
	func: IF<Input, Output[]>,
): IF<Input[], [Output[], [number[], Output[][]]]> => {
	const composed = compose(map(func), concat());
	return composeWithInv(composed, assocRight());
};

export const flatMapSingle = <Input, Output>(
	func: IF<Input, Output[]>,
): IF<Input[], Output[]> => composeMemo(flatMap(func), fst());
