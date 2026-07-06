import { singleKey } from "@/map";
import { isReplaceOnly } from "@/replaceOnly";
import type {
	AnyApply,
	InferApplyChange,
	InferApplyValue,
} from "@/types/algebra";
import { union } from "@/union";
import type { AEither, DeriveEitherShapedChange, Left, Right } from "./types";

export type * from "./types";

export const either = <L extends AnyApply, R extends AnyApply>(
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
): InferApplyChange<AEither<L, R>> => ({ type: "left", change: d });

export const dRight = <L extends AnyApply, R extends AnyApply>(
	d: InferApplyChange<R>,
): InferApplyChange<AEither<L, R>> => ({ type: "right", change: d });

export const matchDEither = <L extends AnyApply, R extends AnyApply>(
	d: InferApplyChange<AEither<L, R>>,
): { left: InferApplyChange<L> } | { right: InferApplyChange<R> } | null => {
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
