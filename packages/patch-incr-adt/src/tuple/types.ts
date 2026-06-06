import type {
	AnyApply,
	Apply,
	InferApplyChange,
	InferApplyValue,
} from "@/types/algebra";

export type AnyTuple = [] | [any, ...any[]];

export type DeriveTupleValue<Tup extends AnyApply[]> = Tup extends []
	? Readonly<[]>
	: Tup extends [infer X, ...infer Xs extends AnyApply[]]
		? Readonly<[InferApplyValue<X>, ...DeriveTupleValue<Xs>]>
		: never;

export type DeriveTupleChange<Tup extends AnyApply[]> = Tup extends []
	? Readonly<[]>
	: Tup extends [infer X, ...infer Xs extends AnyApply[]]
		? Readonly<[InferApplyChange<X> | undefined, ...DeriveTupleChange<Xs>]>
		: never;

export type TupleApply<Tup extends AnyApply[]> = Apply<
	DeriveTupleValue<Tup>,
	DeriveTupleChange<Tup>
>;

export interface Tuple$<Tup extends AnyApply[]> extends TupleApply<Tup> {
	readonly $type: "tuple";
	readonly shape: Readonly<Tup>;
}

type T1 = DeriveTupleValue<[Apply<string>, Apply<number>]>;
type C1 = DeriveTupleChange<[Apply<string>, Apply<number>]>;
