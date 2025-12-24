import { applyPatches, liftPatch, type Patches, replacePatch } from "../patch";
import * as ps from "../patchSchema";
import type { PatchSchema } from "../patchSchema/types";
import type { HasForwardOutput, IF } from "../types";

export type CondOutput<A, B> = [true, A] | [false, B];

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
					? liftPatch(1 as const, left.forward(input, change, out))
					: liftPatch(1 as const, right.forward(input, change, out));
			}

			return nextBranch
				? replacePatch([false, left.evaluate(next)] as never as CondOutput<
						A,
						B
					>)
				: replacePatch([true, right.evaluate(next)] as never as CondOutput<
						A,
						B
					>);
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
