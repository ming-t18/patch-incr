import type { AssignPath } from "@/builder/typeHelpers";
import type { IF, Path } from "@/types";
import { accessPath } from "./access";
import type { IOptics } from "./types";

export type CastWitness<S, T, A, B> = {
	__witness?: [S, T, A, B];
};

export const pathWitness = <
	S,
	A,
	B,
	P extends Path,
	T = AssignPath<S, P, B>,
>() => undefined as never as CastWitness<S, T, A, B>;

export const castOptics = <S, T, A, B, F>(
	o: IOptics<S, A, F>,
	_cw: CastWitness<S, T, A, B>,
): { set: (func: IF<A, B>) => IF<S, T> } => ({ set: o.over as never });

interface Test {
	a: { b: string[] };
}
const w = pathWitness<Test, string[], bigint, ["a", "b"]>();
const ab = accessPath<Test>()(["a", "b"] as const);
const _ab1 = castOptics(ab, w);
