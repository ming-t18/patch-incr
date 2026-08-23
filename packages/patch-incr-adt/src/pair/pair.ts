import type { $A, $D, $T } from "@/types/abbr";
import { tuple } from "../tuple/tuple";

export const pair = <A extends $A, B extends $A>(a: A, b: B) => tuple([a, b]);

export const flip = <A extends $A, B extends $A>({
	shape: [a, b],
}: APair<A, B>): APair<B, A> => pair(b, a);

export type APair<A extends $A, B extends $A> = ReturnType<typeof pair<A, B>>;
export type Pair<A extends $A, B extends $A> = $T<
	ReturnType<typeof pair<A, B>>
>;
export type DPair<A extends $A, B extends $A> = $D<
	ReturnType<typeof pair<A, B>>
>;
