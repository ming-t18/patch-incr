import { type Patches, applyPatches, liftPatch, replacePatch } from "./patch";
import type { IF } from "./types";

export type CondOutput<A, B> = [true, A] | [false, B];

export const cond = <Input, A, B, DInput = Patches<Input>>(
	cond: (value: Input) => boolean,
	left: IF<Input, A, DInput>,
	right: IF<Input, B, DInput>,
	apply = applyPatches as (input: Input, change: DInput) => Input,
): IF<Input, CondOutput<A, B>, DInput> => {
	const invoke = (x: Input): CondOutput<A, B> =>
		cond(x) ? [true, left.invoke(x)] : [false, right.invoke(x)];

	return {
		invoke,
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
				? replacePatch([false, left.invoke(next)] as never as CondOutput<A, B>)
				: replacePatch([true, right.invoke(next)] as never as CondOutput<A, B>);
		},
	};
};
