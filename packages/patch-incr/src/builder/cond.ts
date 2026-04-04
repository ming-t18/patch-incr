import {
	applyPatches,
	liftPatches,
	type Patches,
	replacePatches,
} from "../patch";
import * as ps from "../patchSchema";
import type { PatchSchema } from "../patchSchema/types";
import type {
	AnyIFWithInput,
	HasForwardOutput,
	IF,
	InferIFOutput,
} from "../types";
import { constant } from "./constant";

export type CondOutput<A, B> = [true, A] | [false, B];

/**
 * Given a non-incremental predicate `pred`, evaluates `left` or `right` depending on the predicate
 * is true (left) or false (right).
 *
 * If a change to input `x`, `dx` would change the result of `pred(x @ dx)`,
 * then the replace-patch is returned from `forward`.
 * Therefore the net change `dx` forwarded to `left` or `right` will not have a net result in `cond`
 * changing.
 *
 * If `dx` were to split up then it might be possible to observe `cond` changing in the intermediate steps.
 *
 * To avoid coarse-grained change patches prefer putting conditionals within deeper parts of the computation.
 */
export const cond = <Input, A, B, DInput = Patches<Input>>(
	cond: (value: Input) => boolean,
	left: IF<Input, A, DInput>,
	right: IF<Input, B, DInput>,
	apply = applyPatches as (input: Input, change: DInput) => Input,
): IF<Input, CondOutput<A, B>, DInput> => {
	const evaluate = (x: Input): CondOutput<A, B> =>
		cond(x) ? [true, left.evaluate(x)] : [false, right.evaluate(x)];

	return {
		evaluate,
		forward: (
			input: Input,
			change: DInput,
			[branch, out]: CondOutput<A, B>,
		): Patches<CondOutput<A, B>> => {
			const next = apply(input, change);
			const nextBranch = cond(next);
			if (nextBranch === branch) {
				return branch
					? liftPatches(1 as const, left.forward(input, change, out))
					: liftPatches(1 as const, right.forward(input, change, out));
			}

			return nextBranch
				? replacePatches([false, left.evaluate(next)] as never as CondOutput<
						A,
						B
					>)
				: replacePatches([true, right.evaluate(next)] as never as CondOutput<
						A,
						B
					>);
		},
	};
};

export const condSingle = <
	Input,
	A,
	B = A,
	InputTrue extends Input = Input,
	InputFalse extends Input = Input,
	DInput = Patches<Input>,
	DInputTrue = Patches<InputTrue>,
	DInputFalse = Patches<InputFalse>,
>(
	cond: (value: Input) => boolean,
	left: IF<InputTrue, A, DInputTrue>,
	right: IF<InputFalse, B, DInputFalse>,
	apply = applyPatches as (input: Input, change: DInput) => Input,
): IF<Input, A | B, DInput> => {
	const evaluate = (x: Input): A | B =>
		cond(x) ? left.evaluate(x as InputTrue) : right.evaluate(x as InputFalse);

	return {
		evaluate,
		forward: (input: Input, change: DInput, output: A | B): Patches<A | B> => {
			const branch = cond(input);
			const next = apply(input, change);
			const nextBranch = cond(next);
			if (nextBranch === branch) {
				return branch
					? left.forward(
							input as InputTrue,
							change as Patches as DInputTrue,
							output as A,
						)
					: right.forward(
							input as InputFalse,
							change as Patches as DInputFalse,
							output as B,
						);
			}

			return nextBranch
				? replacePatches(left.evaluate(next as InputTrue))
				: replacePatches(right.evaluate(next as InputFalse));
		},
	};
};

export const switchCase = <
	Case,
	Input,
	Output,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
	ForwardOutput extends boolean = HasForwardOutput,
>(
	getCase: (input: Input) => Case,
	getIF: (
		case_: Case,
	) => IF<Input, Output, InputChange, OutputChange, ForwardOutput>,
	memo = new Map<
		Case,
		IF<Input, Output, InputChange, OutputChange, ForwardOutput>
	>(),
	inputSchema: PatchSchema<Input, InputChange> = ps.atomic() as never,
	outputSchema: PatchSchema<Output, OutputChange> = ps.atomic() as never,
): IF<Input, Output, InputChange, OutputChange, ForwardOutput> => {
	const ensure = (case_: Case) => {
		let res = memo.get(case_);
		if (!res) {
			res = getIF(case_);
			memo.set(case_, res);
		}
		return res;
	};
	const evaluate = (input: Input): Output =>
		ensure(getCase(input)).evaluate(input);
	const forward = (input: Input, dx: InputChange, dy?: never): OutputChange => {
		const case0 = getCase(input);
		const input1 = inputSchema.apply(input, dx);
		const case1 = getCase(input1);
		if (case0 === case1) {
			return ensure(case0).forward(input, dx, dy as never);
		}
		return outputSchema.fromReplace(ensure(case1).evaluate(input1));
	};
	return {
		evaluate,
		forward: forward as never,
	};
};

/**
 * A conditional function that applies a different incremental function based on
 * the value of a particular field. The type checking for each individual case of `Cases` is adjusted accordingly.
 * @param fieldName The field name, must be a constant string
 * @param cases A `Record` from  a possible value of field name to its `IF`.
 *
 * @example
 * ```ts
type Left = { type: "left"; value: { a: number } };
type Middle = { type: "middle"; value: { b: { a: number }[] } };
type Right = { type: "right"; value: { c: string } };
type Union = Left | Middle | Right;

matchUnionFor<"type", Union>("type")({
	left: accessWithFor<Left>()((x) => x.value.a),
	middle: accessWithFor<Middle>()((x) => x.value.b),
	right: accessWithFor<Right>()((x) => x.value.c),
})
```
 */
export const matchUnion = <
	Field extends string | number,
	Input extends Record<Field, string>,
	Cases extends {
		[caseName in Input[Field]]: IF<
			Input & Record<Field, caseName>,
			Output,
			InputChange,
			OutputChange
		>;
	},
	Output = InferIFOutput<Cases[Input[Field]]>,
	InputChange = Patches<Input>,
	OutputChange = Patches<Output>,
>(
	fieldName: Field,
	cases: Cases,
): IF<Input, Output, InputChange, OutputChange> =>
	switchCase(
		(x: Input) => x[fieldName],
		(caseName) => cases[caseName],
	);

/** @see matchUnion */
export const matchUnionFor =
	<Field extends string | number, Input extends Record<Field, string>>(
		fieldName: Field,
	): (<
		Cases extends {
			[caseName in Input[Field]]: AnyIFWithInput<
				Input & Record<Field, caseName>
			>;
		},
		Output = InferIFOutput<Cases[Input[Field]]>,
		InputChange = Patches<Input>,
		OutputChange = Patches<Output>,
	>(
		cases: Cases,
	) => IF<Input, Output, InputChange, OutputChange>) =>
	(cases) =>
		matchUnion(fieldName, cases as never);

export const ifExists = <Input, Output, DefaultValue = undefined>(
	func: IF<Input, Output>,
	defaultValue?: DefaultValue,
): IF<Input | null | undefined, Output | DefaultValue> => {
	return switchCase(
		(x: Input | null | undefined) => x === null || x === undefined,
		(flag) =>
			flag
				? constant(defaultValue as Output | DefaultValue)
				: (func as IF<Input | null | undefined, Output | DefaultValue>),
	);
};
