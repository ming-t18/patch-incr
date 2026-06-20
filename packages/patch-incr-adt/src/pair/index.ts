import type { $A } from "@/types/abbr";
import type {
	AnyApply,
	InferApplyChange,
	InferApplyValue,
} from "@/types/algebra";
import type { IF, IFA } from "@/types/func";
import type { IIsoA } from "@/types/func/iso";
import type { AUnit, AZero } from "@/unit";
import { tuple } from "../tuple/tuple";

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

// Introduction rules
declare const makePair: <C extends $A, A extends $A, B extends $A>(
	c: C,
	pair: APair<A, B>,
	f1: IF<C, A>,
	f2: IF<C, B>,
) => IFA<C, APair<A, B>>;

// Elimination rules
declare const fst: <A extends $A, B extends $A>(
	pair: APair<A, B>,
) => IFA<APair<A, B>, A>;

declare const snd: <A extends $A, B extends $A>(
	pair: APair<A, B>,
) => IFA<APair<A, B>, A>;

// Arrow rules

declare const first: <A extends $A, B extends $A, A1 extends $A>(
	pair: APair<A, B>,
	a1: A1,
	f1: IF<A, A1>,
) => IF<APair<A, B>, APair<A1, B>>;

declare const second: <A extends $A, B extends $A, B1 extends $A>(
	pair: APair<A, B>,
	b1: B1,
	f2: IF<B, B1>,
) => IF<APair<A, B>, APair<A, B1>>;

declare const firstSecond: <
	A extends $A,
	B extends $A,
	A1 extends $A,
	B1 extends $A,
>(
	pair: APair<A, B>,
	a1: A1,
	b1: B1,
	f1: IF<A, A1>,
	f2: IF<B, B1>,
) => IF<APair<A, B>, APair<A1, B1>>;

// Algebraic rules

declare const zeroL: <A extends $A>(a: A) => IIsoA<A, APair<AZero, A>>;
declare const zeroR: <A extends $A>(a: A) => IIsoA<A, APair<A, AZero>>;
declare const unitL: <A extends $A>(a: A) => IIsoA<A, APair<AUnit, A>>;
declare const unitR: <A extends $A>(a: A) => IIsoA<A, APair<A, AUnit>>;

declare const comm: <A extends $A, B extends $A>(
	pair: APair<A, B>,
) => IIsoA<APair<A, B>, APair<B, A>>;

declare const assoc: <A extends $A, B extends $A, C extends $A>(
	a: A,
	b: B,
	c: C,
) => IIsoA<APair<APair<A, B>, C>, APair<A, APair<B, C>>>;
