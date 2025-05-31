import type { IF } from "../types";
import { forwardMapPatches } from "./forwardList";

export const map = <Input, Output>(
	f: IF<Input, Output>,
): IF<Input[], Output[]> => {
	const invokeMap = (xs: Input[]) => xs.map((x) => f.invoke(x));
	const fmp = forwardMapPatches(invokeMap, f);
	return {
		invoke: invokeMap,
		forward: fmp,
	};
};
