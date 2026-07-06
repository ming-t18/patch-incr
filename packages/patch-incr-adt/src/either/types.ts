import type { ASingleKey } from "@/map";
import type { AnyApply, InferApplyChange, InferApplyValue } from "@/types";
import type { AUnion, UnionChangeEntry } from "@/union";

export type AEither<L extends AnyApply, R extends AnyApply> = AUnion<
	{ left: ASingleKey<"left", L>; right: ASingleKey<"right", R> },
	"left" | "right"
>;
export interface Left<T extends AnyApply> {
	left: InferApplyValue<T>;
}
export interface Right<T extends AnyApply> {
	right: InferApplyValue<T>;
}
export type DeriveEitherShapedChange<L extends AnyApply, R extends AnyApply> =
	| UnionChangeEntry<"left", InferApplyChange<L>>
	| UnionChangeEntry<"right", InferApplyChange<R>>;

export type Either<A extends AnyApply, B extends AnyApply> = InferApplyValue<
	AEither<A, B>
>;
export type DEither<A extends AnyApply, B extends AnyApply> = InferApplyChange<
	AEither<A, B>
>;
