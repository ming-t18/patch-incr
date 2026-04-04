import {
	type ArrayPatchReducer0,
	type ArrayPatchReducer2,
	reduceArrayPatches2,
} from "@/algebra/arrayPatch";
import type { CannotReduce } from "@/patch";
import * as ps from "@/patchSchema";
import type { IndexEnd } from "@/patchSchema/types";
import { type Evaluate, type IF, type Patches, PatchOp } from "@/types";
import { identity } from "..";
import { condSingle } from "../cond";
import { forwardMapPatches } from "./helpers/forwardArray";

const mapReducer = <X, Y>(func: IF<X, Y>): ArrayPatchReducer2<X, Y[]> => {
	const ySchema = ps.atomic<Y>();
	const ysSchema = ps.array(ySchema);

	const evaluate = func.evaluate;
	return {
		apply: (
			index: number,
			change: Patches<X>,
			xs: X[],
			ys: Y[],
		): Patches<Y[]> | CannotReduce => {
			return ysSchema.liftIndex(
				index,
				func.forward(xs[index], change, ys[index]),
			);
		},
		add: (index: number | IndexEnd, value: X): Patches<Y[]> | CannotReduce => {
			return ysSchema.add(index, evaluate(value));
		},
		replace: (index: number, value: X): Patches<Y[]> | CannotReduce => {
			return ysSchema.replace(index, evaluate(value));
		},
		remove: (index: number | IndexEnd): Patches<Y[]> | CannotReduce => {
			return ysSchema.remove(index);
		},
	};
};

export const map = <Input, Output>(
	f: IF<Input, Output>,
): IF<Input[], Output[]> => {
	const evaluateMap = (xs: Input[]) => xs.map((x) => f.evaluate(x));
	return {
		evaluate: evaluateMap,
		forward: reduceArrayPatches2(mapReducer(f), evaluateMap),
	};
};

export const mapWhere = <Input, InputSub extends Input>(
	pred: (input: Input) => boolean,
	f: IF<InputSub, Input>,
): IF<Input[], Input[]> => map(condSingle(pred, f, identity<Input>()));
