import { singleKey } from "@/map";
import { isReplaceOnly } from "@/replaceOnly";
import type { $A, $D, $T } from "@/types/algebra";
import { union } from "@/union";
import type { AEither, DeriveEitherShapedChange, Left, Right } from "./types";

export * from "./compose";
export * from "./func";
export type * from "./types";

export const either = <L extends $A, R extends $A>(
	left: L,
	right: R,
): AEither<L, R> =>
	union(
		{
			left: singleKey("left", left),
			right: singleKey("right", right),
		},
		(x) => ("left" in x ? "left" : "right"),
	);

export const getTypes = <L extends $A, R extends $A>(
	input: AEither<L, R>,
): [L, R] => [input.shape.left.inner, input.shape.right.inner];

export function isLeft<L extends $A, R extends $A>(
	x: $T<AEither<L, R>>,
): x is Left<L> {
	return "left" in x;
}

export function isRight<L extends $A, R extends $A>(
	x: $T<AEither<L, R>>,
): x is Right<R> {
	return "right" in x;
}

export const dLeft = <L extends $A, R extends $A>(
	d: $D<L>,
): $D<AEither<L, R>> => ({ type: "left", change: d });

export const dRight = <L extends $A, R extends $A>(
	d: $D<R>,
): $D<AEither<L, R>> => ({ type: "right", change: d });

export const matchDEither = <L extends $A, R extends $A>(
	d: $D<AEither<L, R>>,
): { left: $D<L> } | { right: $D<R> } | null => {
	if (d === null || isReplaceOnly(d)) {
		return null;
	}
	if (d.change === null) {
		return null;
	}
	if (isReplaceOnly(d.change)) {
		return null;
	}
	const d1 = d.change as unknown as DeriveEitherShapedChange<L, R>["change"];
	if (d.type === "left") {
		return { left: d1 };
	}
	return { right: d1 };
};
