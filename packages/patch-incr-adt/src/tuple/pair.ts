import type {
	AnyApply,
	InferApplyChange,
	InferApplyValue,
} from "@/types/algebra";
import { tuple } from "./tuple";

export const pair = <A extends AnyApply, B extends AnyApply>(a: A, b: B) =>
	tuple([a, b]);

export type APair<A extends AnyApply, B extends AnyApply> = ReturnType<
	typeof pair<A, B>
>;
export type Pair<A extends AnyApply, B extends AnyApply> = InferApplyValue<
	ReturnType<typeof pair<A, B>>
>;
export type DPair<A extends AnyApply, B extends AnyApply> = InferApplyChange<
	ReturnType<typeof pair<A, B>>
>;
