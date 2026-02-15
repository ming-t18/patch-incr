import { constant } from "patch-incr/builder";
import * as Arr from "patch-incr/builder/array";
import { distr } from "patch-incr/builder/array/dist";
import { composeMemoLeft as compose2 } from "patch-incr/builder/compose";
import { condSingle } from "patch-incr/builder/cond";
import { fst } from "patch-incr/builder/pair";
import * as Tup from "patch-incr/builder/struct";
import type { IF } from "patch-incr/types";
import * as A from "./arrow";
import { errorKind } from "./error";
import { compose3, Pair } from "./helpers";
import { type EmptyCtx, FuncKind, type Ijq, type IjqMultiple } from "./type";

const singleton = <A, B>(func: IF<A, B>): IF<A, B[]> =>
	// Casting from [B] -> B[]
	Tup.tupleFor<A>()(func) as never;

// TODO spread arguments
export const collect = <A, B, Ctx extends {} = EmptyCtx>(
	gen: Ijq<A, B, Ctx>,
): Ijq<A, B[], Ctx> => {
	if (gen.kind === FuncKind.Single) {
		return {
			kind: FuncKind.Single,
			func: singleton(gen.func),
		};
	}
	if (gen.kind === FuncKind.Multiple) {
		return {
			kind: FuncKind.Single,
			func: gen.func,
		};
	}
	errorKind(gen);
};

export const collectMany = <A, B, Ctx extends {} = EmptyCtx>(
	...gens: Ijq<A, B, Ctx>[]
): Ijq<A, B[], Ctx> => {
	if (gens.length === 0) {
		return A.constant([] as B[]);
	}

	const funcs: IF<[A, Ctx], B[]>[] = [];
	for (const gen of gens) {
		if (gen.kind === FuncKind.Single) {
			funcs.push(singleton(gen.func));
			continue;
		}
		if (gen.kind === FuncKind.Multiple) {
			funcs.push(gen.func);
			continue;
		}
		errorKind(gen as never);
	}
	return {
		kind: FuncKind.Single,
		func: compose3(
			Tup.tupleFor<[A, Ctx]>()(...funcs),
			Arr.concat(),
			Pair.fst(),
		),
	};
};

export const stream = <A, Ctx extends {} = EmptyCtx>(): Ijq<A[], A, Ctx> => {
	return {
		kind: FuncKind.Multiple,
		func: fst(),
	} as IjqMultiple<A[], A, Ctx>;
};

export const map = <A, B, Ctx extends {} = EmptyCtx>(
	func: Ijq<A, B, Ctx>,
): Ijq<A[], B, Ctx> => {
	if (func.kind === FuncKind.Single) {
		return {
			kind: FuncKind.Multiple,
			func: compose2(distr(), Arr.map(func.func)),
		};
	}
	if (func.kind === FuncKind.Multiple) {
		return {
			kind: FuncKind.Multiple,
			func: compose2(distr(), compose2(Arr.flatMap(func.func), fst())),
		};
	}
	errorKind(func);
};

export const select = <A, Ctx extends {} = EmptyCtx>(
	pred: (value: A, ctx: Ctx) => boolean,
): Ijq<A, A, Ctx> => {
	return {
		kind: FuncKind.Multiple,
		func: condSingle<[A, Ctx], A[], A[]>(
			([a, b]: [A, Ctx]) => pred(a, b),
			singleton(fst()),
			constant([] as A[]),
		),
	};
};
