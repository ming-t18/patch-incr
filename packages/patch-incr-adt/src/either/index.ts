import { record } from "@/record";
import type {
	AnyApply,
	InferApplyChange,
	InferApplyValue,
} from "@/types/algebra";
import { type UnionChangeEntry, union } from "@/union";

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

export function isLeft<L extends AnyApply, R extends AnyApply>(
	x: InferApplyValue<AEither<L, R>>,
): x is Left<L> {
	return "left" in x;
}

export function isRight<L extends AnyApply, R extends AnyApply>(
	x: InferApplyValue<AEither<L, R>>,
): x is Right<R> {
	return "right" in x;
}

export const dLeft = <L extends AnyApply, R extends AnyApply>(
	d: InferApplyChange<L>,
): InferApplyChange<AEither<L, R>> => ({ type: "left", change: { left: d } });

export const dRight = <L extends AnyApply, R extends AnyApply>(
	d: InferApplyChange<R>,
): InferApplyChange<AEither<L, R>> => ({ type: "right", change: { right: d } });

export type AEither<A extends AnyApply, B extends AnyApply> = ReturnType<
	typeof either<A, B>
>;
export interface Left<T extends AnyApply> {
	left: InferApplyValue<T>;
}
export interface Right<T extends AnyApply> {
	right: InferApplyValue<T>;
}
export type DeriveEitherShapedChange<L extends AnyApply, R extends AnyApply> =
	| UnionChangeEntry<"left", { readonly left: InferApplyChange<L> }>
	| UnionChangeEntry<"right", { readonly right: InferApplyChange<R> }>;

export type Either<A extends AnyApply, B extends AnyApply> = InferApplyValue<
	AEither<A, B>
>;
export type DEither<A extends AnyApply, B extends AnyApply> = InferApplyChange<
	AEither<A, B>
>;
