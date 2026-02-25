import type { IF } from "@/types";
import { forwardMapPatches } from "./helpers/forwardArray";

export const map = <Input, Output>(
	f: IF<Input, Output>,
): IF<Input[], Output[]> => {
	const evaluateMap = (xs: Input[]) => xs.map((x) => f.evaluate(x));
	const fmp = forwardMapPatches(evaluateMap, f);
	return {
		evaluate: evaluateMap,
		forward: fmp,
	};
};
