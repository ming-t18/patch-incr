import {
	type ArrayPatchReducer0,
	type ArrayPatchReducer1,
	type ArrayPatchReducer2,
	reduceArrayPatches1,
	reduceArrayPatches2,
} from "@/algebra/arrayPatch";
import type { CannotReduce } from "@/patch";
import * as ps from "@/patchSchema";
import type { IndexEnd } from "@/patchSchema/types";
import type {
	ForwardAnyOutput,
	ForwardHasOutput,
	ForwardNoOutput,
	HasForwardOutput,
	IF,
	IFNoForwardOutput,
	Patches,
} from "@/types";
import { identity } from "..";
import { condSingle } from "../cond";

const mapReducer1 = <X, Y>(
	func: IFNoForwardOutput<X, Y>,
	ySchema = ps.atomic<Y>(),
	ysSchema = ps.array(ySchema),
): ArrayPatchReducer1<X, Y[]> => ({
	apply: (
		index: number,
		change: Patches<X>,
		xs: X[],
	): Patches<Y[]> | CannotReduce =>
		ysSchema.liftIndex(index, func.forward(xs[index], change)),
	add: (index: number | IndexEnd, value: X): Patches<Y[]> | CannotReduce =>
		ysSchema.add(index, func.evaluate(value)),
	replace: (index: number, value: X): Patches<Y[]> | CannotReduce =>
		ysSchema.replace(index, func.evaluate(value)),
	remove: (index: number | IndexEnd): Patches<Y[]> | CannotReduce =>
		ysSchema.remove(index),
});

const mapReducer2 = <X, Y>(func: IF<X, Y>): ArrayPatchReducer2<X, Y[]> => {
	const ySchema = ps.atomic<Y>();
	const ysSchema = ps.array(ySchema);
	return {
		...mapReducer1(func, ySchema, ysSchema),
		apply: (
			index: number,
			change: Patches<X>,
			xs: X[],
			ys: Y[],
		): Patches<Y[]> | CannotReduce =>
			ysSchema.liftIndex(index, func.forward(xs[index], change, ys[index])),
	};
};

export const map = <
	Input,
	Output,
	ForwardOutput extends boolean = HasForwardOutput,
>(
	f: IF<Input, Output, Patches<Input>, Patches<Output>, ForwardOutput>,
	forwardOutput = true as ForwardOutput,
): IF<
	Input[],
	Output[],
	Patches<Input[]>,
	Patches<Output[]>,
	ForwardOutput
> => {
	const evaluateMap = (xs: Input[]) => xs.map((x) => f.evaluate(x));
	return {
		evaluate: evaluateMap,
		forward: forwardOutput
			? (reduceArrayPatches2(mapReducer2(f), evaluateMap) as ForwardAnyOutput<
					Input[],
					Output[]
				>)
			: (reduceArrayPatches1(
					mapReducer1(f as IFNoForwardOutput<Input, Output>),
					evaluateMap,
				) as ForwardAnyOutput<Input[], Output[]>),
	};
};

export const mapWhere = <Input, InputSub extends Input>(
	pred: (input: Input) => boolean,
	f: IF<InputSub, Input>,
): IF<Input[], Input[]> => map(condSingle(pred, f, identity<Input>()));
