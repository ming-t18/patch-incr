import type { IF } from "@/types";
import { identity } from "..";
import { condSingle } from "../cond";
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

export const mapWhere = <Input, InputSub extends Input>(
	pred: (input: Input) => boolean,
	f: IF<InputSub, Input>,
): IF<Input[], Input[]> => map(condSingle(pred, f, identity<Input>()));
