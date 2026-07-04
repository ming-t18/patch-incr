import { record } from "@/record";
import { isReplaceOnly } from "@/replaceOnly";
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

export const matchDEither = <L extends AnyApply, R extends AnyApply>(
	input: AEither<L, R>,
	d: InferApplyChange<AEither<L, R>>,
): { left: InferApplyChange<L> } | { right: InferApplyChange<R> } | null => {
	const { shape } = input;
	if (d === null || isReplaceOnly(d)) {
		return null;
	}
	if (d.change === null) {
		return null;
	}
	if (isReplaceOnly(d.change)) {
		return null;
	}
	const d1 = d.change as unknown as DeriveEitherShapedChange<L, R>;
	if (d1.type === "left") {
		if (d1.change === null) {
			return { left: shape.left.empty };
		}
		if (isReplaceOnly(d1.change)) {
			return null;
		}
		return { left: d1.change.left };
	}
	if (d1.change === null) {
		return { right: shape.right.empty };
	}
	if (isReplaceOnly(d1.change)) {
		return null;
	}
	return { right: d1.change.right };
};

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
