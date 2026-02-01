import * as Struct from "patch-incr/builder/struct";
import type { Merged } from "patch-incr/builder/struct/merge";
import * as A from "./arrow";
import { errorKind as kindError } from "./error";
import { Arr, Builder, compose2, compose3, Dist, Pair } from "./helpers";
import * as AP from "./pair";
import { type EmptyCtx, FuncKind, type Ijq, type IjqSingle } from "./type";

export const getCtx = <A, Ctx extends {} = EmptyCtx>(): Ijq<A, Ctx, Ctx> =>
	({
		kind: FuncKind.Single,
		func: Pair.snd(),
	}) as IjqSingle<A, Ctx, Ctx>;

export const getPairWithCtx = <A, Ctx extends {} = EmptyCtx>(): Ijq<
	A,
	[A, Ctx],
	Ctx
> =>
	({
		kind: FuncKind.Single,
		func: Builder.identity<[A, Ctx]>(),
	}) as IjqSingle<A, [A, Ctx], Ctx>;

export const withCtx =
	<A, Ctx extends {} = EmptyCtx, CtxInner extends {} = EmptyCtx>(
		ctxFunc: Ijq<A, CtxInner, Ctx>,
	) =>
	<B>(func: Ijq<A, B, CtxInner>): Ijq<A, B, Ctx> => {
		if (ctxFunc.kind === FuncKind.Single) {
			if (func.kind === FuncKind.Single) {
				return {
					kind: FuncKind.Single,
					func: compose2(Pair.pair(Pair.fst(), ctxFunc.func), func.func),
				};
			}
			if (func.kind === FuncKind.Multiple) {
				return {
					kind: FuncKind.Multiple,
					func: compose2(Pair.pair(Pair.fst(), ctxFunc.func), func.func),
				};
			}
			kindError(func);
		}
		if (ctxFunc.kind === FuncKind.Multiple) {
			if (func.kind === FuncKind.Single) {
				return {
					kind: FuncKind.Multiple,
					func: compose3(
						Pair.pair(Pair.fst(), ctxFunc.func),
						Dist.distl(),
						Arr.map(func.func),
					),
				};
			}
			if (func.kind === FuncKind.Multiple) {
				return {
					kind: FuncKind.Multiple,
					func: compose3(
						Pair.pair(Pair.fst(), ctxFunc.func),
						Dist.distl(),
						compose2(Arr.flatMap(func.func), Pair.fst()),
					),
				};
			}
			kindError(func);
		}
		kindError(ctxFunc);
	};

export const assignCtx =
	<A extends WeakKey>() =>
	<Key extends string, Value, Ctx extends {} = EmptyCtx>(
		key: Key,
		getValue: Ijq<A, Value, Ctx>,
	) =>
	<B>(
		func: Ijq<A, B, Merged<Ctx, { [key in Key]: Value }>>,
	): Ijq<A, B, Ctx> => {
		type MergeWith = { [key in Key]: Value };
		type CtxInner = Merged<Ctx, MergeWith>;
		const makeMergeWith: Ijq<A, MergeWith, Ctx> = A.compose(
			getValue,
			A.single(Struct.template0((value) => ({ [key]: value }) as MergeWith)),
		);
		const doMerge: Ijq<A, CtxInner, Ctx> = A.compose(
			AP.pair(getCtx(), makeMergeWith),
			A.single(Struct.merge()),
		);
		return withCtx<A, Ctx, CtxInner>(doMerge)<B>(func);
	};

export const castCtx =
	<CtxSub extends Ctx, Ctx extends {} = EmptyCtx>() =>
	<A, B>(func: Ijq<A, B, Ctx>): Ijq<A, B, CtxSub> =>
		func as never;
