import { record } from "@/record";
import type {
	AnyApply,
	InferApplyChange,
	InferApplyValue,
} from "@/types/algebra";
import { union } from "@/union";

export const either = <L extends AnyApply, R extends AnyApply>(
	left: L,
	right: R,
) =>
	union(
		{
			left: record({ left }),
			right: record({ right }),
		},
		(x) => ("left" in x ? "left" : "right"),
	);

export type AEither<A extends AnyApply, B extends AnyApply> = ReturnType<
	typeof either<A, B>
>;
export type Either<A extends AnyApply, B extends AnyApply> = InferApplyValue<
	AEither<A, B>
>;
export type DEither<A extends AnyApply, B extends AnyApply> = InferApplyChange<
	AEither<A, B>
>;
