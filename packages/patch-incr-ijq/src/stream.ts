/** biome-ignore-all lint/style/noNonNullAssertion: for dealing varargs */
import * as IFArray from "patch-incr/builder/array";
import { composeMemo } from "patch-incr/builder/compose";
import * as IFPair from "patch-incr/builder/pair";
import { tupleFor } from "patch-incr/builder/struct";
import type { AnyIF, IF } from "patch-incr/types";
import * as A from "./arrow";
import { type EmptyCtx, FuncKind, type Ijq } from "./type";

const pairToArray = <A, B>(f1: IF<A, B>, f2: IF<A, B>): IF<A, B[]> => {
	return IFPair.pair(f1, f2) satisfies IF<A, [B, B]> as AnyIF;
};

const singletonArray = <A, B>(f: IF<A, B>): IF<A, B[]> =>
	tupleFor<A>()(f) satisfies IF<A, [B]> as AnyIF;

const concatArray2 = <A extends WeakKey, B>(
	f1: IF<A, B[]>,
	f2: IF<A, B[]>,
): IF<A, B[]> => {
	const split: IF<[A, A], B[][]> = IFPair.firstSecond(f1, f2) satisfies IF<
		[A, A],
		[B[], B[]]
	> as AnyIF;
	return composeMemo(
		composeMemo(IFPair.dup<A>(), split),
		composeMemo(IFArray.concat(), IFPair.fst()),
	);
};

export const concat2 = <A extends WeakKey, B, Ctx extends {} = EmptyCtx>(
	f1: Ijq<A, B, Ctx>,
	f2: Ijq<A, B, Ctx>,
): Ijq<A, B, Ctx> => {
	if (f1.kind === FuncKind.Single) {
		if (f2.kind === FuncKind.Single) {
			return {
				kind: FuncKind.Multiple,
				func: pairToArray(f1.func, f2.func),
			};
		}
		return {
			kind: FuncKind.Multiple,
			func: concatArray2(singletonArray(f1.func), f2.func),
		};
	}

	if (f2.kind === FuncKind.Single) {
		return {
			kind: FuncKind.Multiple,
			func: concatArray2(f1.func, singletonArray(f2.func)),
		};
	}
	return {
		kind: FuncKind.Multiple,
		func: concatArray2(f1.func, f2.func),
	};
};

/** JQ: `A, B, ...` */
export const concat = <A extends WeakKey, B, Ctx extends {} = EmptyCtx>(
	...funcs: Ijq<A, B, Ctx>[]
): Ijq<A, B, Ctx> => {
	if (funcs.length === 0) {
		return A.empty();
	}
	if (funcs.length === 1) {
		return funcs[0]!;
	}
	if (funcs.length === 2) {
		return concat2(funcs[0]!, funcs[1]!);
	}
	return funcs.reduce(concat2);
};

export { constant, empty, of } from "./arrow";
