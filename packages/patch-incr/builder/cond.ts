import { applyPatches, liftPatch, type Patches, replacePatch } from "../patch";
import type { IF } from "../types";

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
