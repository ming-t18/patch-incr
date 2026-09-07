import type { ASingleKey } from "@/map";
import type { $A, $D, $T } from "@/types";
import type { AUnion, UnionChangeEntry } from "@/union";

export type AEither<L extends $A, R extends $A> = AUnion<
	{ left: ASingleKey<"left", L>; right: ASingleKey<"right", R> },
	"left" | "right"
>;
export interface Left<T extends $A> {
	left: $T<T>;
}
export interface Right<T extends $A> {
	right: $T<T>;
}
export type DeriveEitherShapedChange<L extends $A, R extends $A> =
	| UnionChangeEntry<"left", $D<L>>
	| UnionChangeEntry<"right", $D<R>>;

export type DEither<A extends $A, B extends $A> = $D<AEither<A, B>>;
