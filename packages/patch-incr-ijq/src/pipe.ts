import { access } from "patch-incr/builder/struct";
import type { Merged } from "patch-incr/builder/struct/merge";
import type { IF } from "patch-incr/types";
import * as Arr from "./array";
import * as A from "./arrow";
import { assignCtx } from "./context";
import type { EmptyCtx, Ijq } from "./type";

export type Composer<In, Out, Ctx extends {}, Ctx1 extends {}> = <B>(
	next?: Ijq<Out, B, Ctx1>,
) => Ijq<In, B, Ctx>;

export class Pipe<
	In extends WeakKey,
	Out = In,
	Ctx extends {} = EmptyCtx,
	Ctx1 extends {} = Ctx,
> {
	public constructor(
		public _composer: Composer<In, Out, Ctx, Ctx1> = ((f: unknown) =>
			f ?? A.identity()) as never,
	) {}

	private _cont<Out2, Ctx2 extends {} = Ctx1>(
		transformComposer: (
			c0: Composer<In, Out, Ctx, Ctx1>,
		) => Composer<In, Out2, Ctx, Ctx2>,
	): Pipe<In, Out2, Ctx, Ctx2> {
		const composer0 = this._composer;
		const that = this as never as Pipe<In, Out2, Ctx, Ctx2>;
		that._composer = transformComposer(composer0);
		return that;
	}

	private _push<Out0 extends WeakKey, Out1>(
		this: Pipe<In, Out0, Ctx, Ctx1>,
		func: Ijq<Out0, Out1, Ctx1>,
	): Pipe<In, Out1, Ctx, Ctx1> {
		return this._cont((c0: Composer<In, Out0, Ctx, Ctx1>) => {
			const c1: Composer<In, Out1, Ctx, Ctx1> = <B1>(
				next?: Ijq<Out1, B1, Ctx1>,
			) => c0(next ? A.compose(func, next) : (func as never));
			return c1;
		});
	}

	build(): Ijq<In, Out, Ctx> {
		return this._composer();
	}

	/**
	 * JQ: `CUR | FUNC | NEXT`
	 */
	pipe<Out0 extends WeakKey, Out1>(
		this: Pipe<In, Out0, Ctx, Ctx1>,
		func: Ijq<Out0, Out1, Ctx1>,
	): Pipe<In, Out1, Ctx, Ctx1> {
		return this._push(func);
	}

	/**
	 * JQ: `CUR | FUNC | NEXT`
	 */
	pipeIF<Out0 extends WeakKey, Out1>(
		this: Pipe<In, Out0, Ctx, Ctx1>,
		func: IF<Out0, Out1>,
	): Pipe<In, Out1, Ctx, Ctx1> {
		return this._push(A.single(func));
	}

	/**
	 * JQ: `CUR | FUNC | NEXT`
	 */
	pipeIFMulti<Out0 extends WeakKey, Out1>(
		this: Pipe<In, Out0, Ctx, Ctx1>,
		func: IF<Out0, Out1[]>,
	): Pipe<In, Out1, Ctx, Ctx1> {
		return this._push(A.multi(func));
	}

	/**
	 * JQ: `CUR | .FIELD | NEXT`
	 */
	_<Out1 extends Record<Key, unknown>, Key extends string | number>(
		this: Pipe<In, Out1, Ctx, Ctx1>,
		key: Key,
	): Pipe<In, Out1[Key], Ctx, Ctx1> {
		// @ts-expect-error Can't be checked
		return this._push(A.single(access(key)));
	}

	/**
	 * JQ: `CUR | .[] | NEXT`
	 */
	stream<T>(this: Pipe<In, T[], Ctx, Ctx1>): Pipe<In, T, Ctx, Ctx1> {
		return this._push(Arr.stream());
	}

	/**
	 * JQ: `[CUR] | NEXT`
	 */
	collect<T>(this: Pipe<In, T, Ctx, Ctx1>): Pipe<In, T[], Ctx, Ctx> {
		return this._cont((composer0) => {
			const c1: Composer<In, T[], Ctx, Ctx> = <B1>(
				next?: Ijq<T[], B1, Ctx>,
			): Ijq<In, B1, Ctx> => {
				const res: Ijq<In, T[], Ctx> = Arr.collect(composer0());
				return next ? A.compose(res, next) : (res as never);
			};
			return c1;
		});
	}

	/**
	 * JQ: `CUR | VALUE as $KEY | NEXT`
	 */
	$<Out extends WeakKey, Key extends string, Value>(
		this: Pipe<In, Out, Ctx, Ctx1>,
		key: Key,
		getValue: Ijq<Out, Value, Ctx1>,
	): Pipe<In, Out, Ctx, Merged<Ctx1, Record<Key, Value>>> {
		type CtxMerged = Merged<Ctx1, Record<Key, Value>>;
		return this._cont(
			(c0) =>
				<B1>(next?: Ijq<Out, B1, CtxMerged>): Ijq<In, B1, Ctx> => {
					const res: Ijq<Out, B1, Ctx1> = assignCtx<Out>()<Key, Value, Ctx1>(
						key,
						getValue,
					)<B1>(next ? next : (A.identity() as never));
					return c0(res);
				},
		);
	}

	/**
	 * JQ: `CUR | .KEY as $KEY | NEXT`
	 */
	$$<Key extends string, Out extends Record<Key, unknown>>(
		this: Pipe<In, Out, Ctx, Ctx1>,
		key: Key,
	): Pipe<In, Out, Ctx, Merged<Ctx1, Record<Key, Out[Key]>>> {
		return this.$(key, A.single(access(key))) as never;
	}
}

export const pipe = <In extends WeakKey, Ctx extends {} = EmptyCtx>(): Pipe<
	In,
	In,
	Ctx
> => new Pipe();
