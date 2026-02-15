import { constant as constant_ } from "patch-incr/builder";
import { tupleFor } from "patch-incr/builder/struct";
import type { AnyIF, IF } from "patch-incr/types";
import { errorKind } from "./error";
import {
	Arr,
	Builder,
	compose2,
	compose3,
	composeReeval,
	Dist,
	Pair,
} from "./helpers";
import type { EmptyCtx, Ijq, IjqMultiple, IjqSingle } from "./type";
import { FuncKind } from "./type";

const ignoringCtx = <A, B, Ctx>(func: IF<A, B>): IF<[A, Ctx], B> =>
	compose2(Pair.fst(), func);

const composeReader = <A extends WeakKey, B, C, Ctx>(
	a: IF<[A, Ctx], B>,
	b: IF<[B, Ctx], C>,
): IF<[A, Ctx], C> => compose2(Pair.pair(a, Pair.snd()), b);

const composeReaderMulti = <A extends WeakKey, B, C, Ctx>(
	a: IF<[A, Ctx], B[]>,
	b: IF<[B, Ctx], C>,
): IF<[A, Ctx], C[]> =>
	compose3(Pair.pair(a, Pair.snd()), Dist.distr(), Arr.map(b));

export const single = <A, B, Ctx extends {} = EmptyCtx>(
	func: IF<A, B>,
): IjqSingle<A, B, Ctx> => ({
	kind: FuncKind.Single,
	func: ignoringCtx(func),
});

export const multi = <A, B, Ctx extends {} = EmptyCtx>(
	func: IF<A, B[]>,
): IjqMultiple<A, B, Ctx> => ({
	kind: FuncKind.Multiple,
	func: ignoringCtx(func),
});

export const compose = <A extends WeakKey, B, C, Ctx extends {} = EmptyCtx>(
	a: Ijq<A, B, Ctx>,
	b: Ijq<B, C, Ctx>,
): Ijq<A, C, Ctx> => {
	if (a.kind === FuncKind.Single) {
		if (b.kind === FuncKind.Single) {
			return {
				kind: FuncKind.Single,
				func: composeReader(a.func, b.func),
			};
		} else if (b.kind === FuncKind.Multiple) {
			return {
				kind: FuncKind.Multiple,
				func: composeReader(a.func, b.func),
			};
		}
		errorKind(b);
	}

	if (a.kind === FuncKind.Multiple) {
		if (b.kind === FuncKind.Single) {
			return {
				kind: FuncKind.Multiple,
				func: composeReaderMulti(a.func, b.func),
			};
		} else if (b.kind === FuncKind.Multiple) {
			return {
				kind: FuncKind.Multiple,
				func: compose3(
					composeReaderMulti(a.func, b.func),
					Arr.concat(),
					Pair.fst(),
				),
			};
		}
		errorKind(b);
	}
	errorKind(a);
};

/** `(&&&)` */
export const pair = <I extends WeakKey, A, B, Ctx extends {} = EmptyCtx>(
	f1: Ijq<I, A, Ctx>,
	f2: Ijq<I, B, Ctx>,
): Ijq<I, [A, B], Ctx> => {
	if (f1.kind === FuncKind.Single) {
		if (f2.kind === FuncKind.Single) {
			return {
				kind: FuncKind.Single,
				func: Pair.pair(f1.func, f2.func),
			};
		} else if (f2.kind === FuncKind.Multiple) {
			return {
				kind: FuncKind.Multiple,
				func: compose2(Pair.pair(f1.func, f2.func), Dist.distl()),
			};
		}
		errorKind(f2);
	}

	if (f1.kind === FuncKind.Multiple) {
		if (f2.kind === FuncKind.Single) {
			return {
				kind: FuncKind.Multiple,
				func: compose2(Pair.pair(f1.func, f2.func), Dist.distr()),
			};
		} else if (f2.kind === FuncKind.Multiple) {
			return {
				kind: FuncKind.Multiple,
				func: compose2(Pair.pair(f1.func, f2.func), Arr.cartesian()),
			};
		}
		errorKind(f2);
	}
	errorKind(f1);
};

export const apply = <A, B, Ctx extends {} = EmptyCtx>(
	func: Ijq<A, B, Ctx>,
	input: A,
	ctx: Ctx,
): B[] => {
	if (func.kind === FuncKind.Single) {
		return [func.func.evaluate([input, ctx])];
	}
	if (func.kind === FuncKind.Multiple) {
		return func.func.evaluate([input, ctx]);
	}
	errorKind(func);
};

export const toIF = <A, B, Ctx extends {} = EmptyCtx>(
	func: Ijq<A, B, Ctx>,
): IF<[A, Ctx], B[]> => {
	if (func.kind === FuncKind.Single) {
		return tupleFor<[A, Ctx]>()(func.func) as AnyIF;
	}
	if (func.kind === FuncKind.Multiple) {
		return func.func;
	}
	errorKind(func);
};

export const toIFNoCtx = <A extends WeakKey, B, Ctx extends {} = EmptyCtx>(
	func: Ijq<A, B, Ctx>,
	ctx = {} as Ctx,
): IF<A, B[]> => {
	return composeReeval(
		Pair.pair<A, A, Ctx>(Builder.identity<A>(), Builder.constant<Ctx, A>(ctx)),
		toIF(func),
	);
};

export const identity = <A, Ctx extends {} = EmptyCtx>(): Ijq<A, A, Ctx> => ({
	kind: FuncKind.Single,
	func: Pair.fst(),
});

/** JQ: `empty` */
export const empty = <A, B, Ctx extends {} = EmptyCtx>(): Ijq<A, B, Ctx> => ({
	kind: FuncKind.Multiple,
	func: constant_([] as B[]),
});

export const constant = <A, C, Ctx extends {} = EmptyCtx>(
	value: C,
): Ijq<A, C, Ctx> => ({
	kind: FuncKind.Single,
	func: constant_(value),
});

export const constantMulti = <A, C, Ctx extends {} = EmptyCtx>(
	values: C[],
): Ijq<A, C, Ctx> => {
	if (values.length === 0) {
		return empty();
	}
	if (values.length === 1) {
		return constant(values[0] as C);
	}

	return {
		kind: FuncKind.Multiple,
		func: constant_(values),
	};
};

/** Create a stream based on the constants in the parameters. */
export const of = <A, C, Ctx extends {} = EmptyCtx>(
	...values: C[]
): Ijq<A, C, Ctx> => constantMulti(values);
