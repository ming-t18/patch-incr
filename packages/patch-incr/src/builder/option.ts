import { atomicFunc, castOutput, constant, identity } from "@/builder";
import { composeMemo } from "@/builder/compose";
import { condSingle } from "@/builder/cond";
import { accessPathFor, tupleFor } from "@/builder/struct";
import type { AnyIF, IF } from "@/types";

/**
 * An option type encoded with a zero-length or one-length tuple.
 * This representation allows `Option`s to be assignable to arrays.
 */
export type Option<A> = [] | [A];

export const Nothing: Option<never> = [];

export const isNothing = <A>(): IF<Option<A>, boolean> =>
	atomicFunc((x) => x.length === 0);

export const isJust = <A>(): IF<Option<A>, boolean> =>
	atomicFunc((x) => x.length === 1);

const unwrap = <A>(): IF<[A], A> => accessPathFor<[A]>()([0]);

export const just = <A, B = A>(f?: IF<A, B>): IF<A, Option<B>> =>
	castOutput(tupleFor<A>()(f ?? (identity() as AnyIF)));

export const just0 = <A>(): IF<A, Option<A>> => just(identity<A>());

export const nothing = <A, Input>(): IF<Input, Option<A>> =>
	constant<Option<A>, Input>(Nothing as Option<A>);

/**
 * Given a predicate, constructs an `IF` that:
 *  - returns a `Just` if the predicate is true
 *  - returns `Nothing` if the predicate is false
 */
export const fromPred = <A, ASub extends A = A>(
	pred: (value: A) => boolean,
): IF<A, Option<ASub>> =>
	condSingle(pred, just0(), constant<Option<ASub>, A>(Nothing));

export const elim = <A, B>(func: IF<A, B>, ifNothing: B): IF<Option<A>, B> =>
	condSingle<Option<A>, B, B, [A], []>(
		(x: Option<A>) => x.length === 0,
		composeMemo(unwrap(), func),
		constant(ifNothing),
	);

export const map = <A, B>(func: IF<A, B>): IF<Option<A>, Option<B>> =>
	elim<A, Option<B>>(just(func), Nothing as Option<B>);

export const fromDefined = <
	A,
	AN extends A | null | undefined = A | null | undefined,
>(): IF<AN, Option<A>> =>
	condSingle<AN, Option<A>>(
		(x: AN) => x !== null && x !== undefined,
		just0<A>() as AnyIF,
		constant(Nothing) as AnyIF,
	);

export const join = <A>(): IF<Option<Option<A>>, Option<A>> =>
	elim(identity(), Nothing);

export const compose = <A extends WeakKey, B, C>(
	f1: IF<A, Option<B>>,
	f2: IF<B, Option<C>>,
): IF<A, Option<C>> => composeMemo(f1, elim(f2, Nothing));
