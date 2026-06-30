import type { DeriveProductShapedChangeTuple } from "@/product";
import type { AnyApply, Apply, DRO, InferApplyValue } from "@/types/algebra";

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyTuple<T = any> = [] | [T, ...T[]];

export type DeriveTupleValue<Shape extends AnyTuple<AnyApply>> =
	Shape extends []
		? Readonly<[]>
		: Shape extends [
					infer X extends AnyApply,
					...infer Xs extends AnyTuple<AnyApply>,
				]
			? Readonly<[InferApplyValue<X>, ...DeriveTupleValue<Xs>]>
			: never;

export type DeriveTupleChange<Shape extends AnyTuple<AnyApply>> =
	| DeriveProductShapedChangeTuple<Shape>
	| DRO<DeriveTupleValue<Shape>>;

export type TupleApply<Tup extends AnyTuple<AnyApply>> = Apply<
	DeriveTupleValue<Tup>,
	DeriveTupleChange<Tup>
>;

export type KeyOfTuple<T extends AnyTuple> = `${number}` & keyof T;

export interface Tuple$<Tup extends AnyTuple<AnyApply>>
	extends TupleApply<Tup> {
	readonly $type: "tuple";
	readonly shape: Readonly<Tup>;
}
