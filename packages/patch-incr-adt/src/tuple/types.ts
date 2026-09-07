import type { DeriveProductShapedChangeTuple } from "@/product";
import type { $A, $T, Apply, DRO } from "@/types/algebra";

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyTuple<T = any> = [] | [T, ...T[]];

export type DeriveTupleValue<Shape extends AnyTuple<$A>> = Shape extends []
	? Readonly<[]>
	: Shape extends [infer X extends $A, ...infer Xs extends AnyTuple<$A>]
		? Readonly<[$T<X>, ...DeriveTupleValue<Xs>]>
		: never;

export type DeriveTupleChange<Shape extends AnyTuple<$A>> =
	| DeriveProductShapedChangeTuple<Shape>
	| DRO<DeriveTupleValue<Shape>>;

export type TupleApply<Tup extends AnyTuple<$A>> = Apply<
	DeriveTupleValue<Tup>,
	DeriveTupleChange<Tup>
>;

export type KeyOfTuple<T extends AnyTuple> = `${number}` & keyof T;

export interface Tuple$<Tup extends AnyTuple<$A>> extends TupleApply<Tup> {
	readonly $type: "tuple";
	readonly shape: Readonly<Tup>;
}
