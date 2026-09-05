import * as B from "@/funcs/basic";
import { type AEither, Pair } from "@/index";
import { type APair, pair } from "@/pair";
import type { $A, $T, IF } from "@/types";

export interface IReaderLift<Ctx extends $A, A extends $A, B extends $A> {
	usesCtx: false;
	ctx: Ctx;
	func: IF<A, B>;
}
export interface IReaderUsesCtx<Ctx extends $A, A extends $A, B extends $A> {
	usesCtx: true;
	func: IF<APair<A, Ctx>, B>;
}
export type IReader<Ctx extends $A, A extends $A, B extends $A> =
	| IReaderLift<Ctx, A, B>
	| IReaderUsesCtx<Ctx, A, B>;

export const getTypes = <Ctx extends $A, A extends $A, B extends $A>(
	r: IReader<Ctx, A, B>,
): [Ctx, A, B] => {
	if (!r.usesCtx) {
		return [r.ctx, r.func.input, B.getOutput(r.func)];
	}
	return [r.func.input.shape[1], r.func.input.shape[0], B.getOutput(r.func)];
};
export const getOutput = <Ctx extends $A, A extends $A, B extends $A>(
	r: IReader<Ctx, A, B>,
): B => getTypes(r)[2];

export const arr =
	<Ctx extends $A>(ctx: Ctx) =>
	<A extends $A, B extends $A>(f: IF<A, B>): IReader<Ctx, A, B> => ({
		usesCtx: false,
		ctx,
		func: f,
	});

/** Alias of `arr` */
export const lift = arr;

export const ask =
	<Ctx extends $A>(ctx: Ctx) =>
	<A extends $A>(a: A): IReader<Ctx, A, Ctx> => ({
		usesCtx: true,
		func: Pair.snd(pair(a, ctx)),
	});

export const fromReader = <Ctx extends $A, A extends $A, B extends $A>(
	f: IF<APair<A, Ctx>, B>,
): IReader<Ctx, A, B> => ({ usesCtx: true, func: f });

/** Converts an `IReader` to an `IF` by providing a constant context value. */
export const runConstantCtx = <Ctx extends $A, A extends $A, B extends $A>(
	r: IReader<Ctx, A, B>,
	ctxValue: $T<Ctx>,
): IF<A, B> => {
	if (!r.usesCtx) {
		return r.func;
	}
	const [ctx, a, _b] = getTypes(r);
	return B.compose(
		Pair.fork(a)(B.identity(a), B.constant(a, ctx, ctxValue)),
		r.func,
	);
};

export const toUsesCtx = <Ctx extends $A, A extends $A, B extends $A>(
	r: IReader<Ctx, A, B>,
): IReaderUsesCtx<Ctx, A, B> => {
	if (!r.usesCtx) {
		const a: A = r.func.input;
		return { usesCtx: true, func: B.compose(Pair.fst(pair(a, r.ctx)), r.func) };
	}
	return r;
};

export const runReader = <Ctx extends $A, A extends $A, B extends $A>(
	r: IReader<Ctx, A, B>,
): IF<APair<A, Ctx>, B> => toUsesCtx(r).func;

export const identity = <Ctx extends $A, A extends $A>(
	ctx: Ctx,
	input: A,
): IReader<Ctx, A, A> => ({
	usesCtx: false,
	ctx,
	func: B.identity(input),
});

export const passthru =
	<Ctx extends $A, A extends $A, B extends Ctx>(ctx: Ctx) =>
	(f: IReader<Ctx, A, B>): IReader<Ctx, A, APair<B, Ctx>> => {
		if (!f.usesCtx) {
			const ta: A = f.func.input;
			return {
				usesCtx: true,
				func: Pair.first(pair(ta, ctx))(f.func),
			};
		}
		const a: A = f.func.input.shape[0];
		return {
			usesCtx: true,
			func: Pair.fork(pair(a, ctx))(f.func, Pair.snd(pair(a, ctx))),
		};
	};

export const compose = <
	Ctx extends $A,
	A extends $A,
	B extends $A,
	C extends $A,
>(
	f1: IReader<Ctx, A, B>,
	f2: IReader<Ctx, B, C>,
): IReader<Ctx, A, C> => {
	if (!f1.usesCtx) {
		if (!f2.usesCtx) {
			return { usesCtx: false, ctx: f1.ctx, func: B.compose(f1.func, f2.func) };
		}
		const a: A = f1.func.input;
		const ctx: Ctx = f2.func.input.shape[1];
		return {
			usesCtx: true,
			func: B.compose(Pair.first(pair(a, ctx))(f1.func), f2.func),
		};
	}
	const a: A = f1.func.input.shape[0];
	const b: B = f2.usesCtx ? f2.func.input.shape[0] : f2.func.input;
	const ctx: Ctx = f1.func.input.shape[1];
	const left: IF<APair<A, Ctx>, APair<B, Ctx>> = Pair.fork(pair(a, ctx))(
		f1.func,
		Pair.snd(pair(a, ctx)),
	);
	if (!f2.usesCtx) {
		return {
			usesCtx: true,
			func: B.compose(left, B.compose(Pair.fst(pair(b, ctx)), f2.func)),
		};
	}

	return {
		usesCtx: true,
		func: B.compose(left, f2.func),
	};
};

export const first =
	<A extends $A, B extends $A>(input: APair<A, B>) =>
	<Ctx extends $A, A1 extends $A>(
		f1: IReader<Ctx, A, A1>,
	): IReader<Ctx, APair<A, B>, APair<A1, B>> => {
		const [a, b] = input.shape;
		if (!f1.usesCtx) {
			return {
				usesCtx: false,
				ctx: f1.ctx,
				func: Pair.first(input)(f1.func),
			};
		}
		const ctx: Ctx = f1.func.input.shape[1];
		return {
			usesCtx: true,
			func: B.compose(
				Pair.distrFst(pair(input, ctx)),
				Pair.first(pair(pair(a, ctx), b))(f1.func),
			),
		};
	};

export const second =
	<A extends $A, B extends $A>(input: APair<A, B>) =>
	<Ctx extends $A, B1 extends $A>(
		f1: IReader<Ctx, B, B1>,
	): IReader<Ctx, APair<A, B>, APair<A, B1>> => {
		const [a, b] = input.shape;
		if (!f1.usesCtx) {
			return {
				usesCtx: false,
				ctx: f1.ctx,
				func: Pair.second(input)(f1.func),
			};
		}
		const ctx: Ctx = f1.func.input.shape[1];
		return {
			usesCtx: true,
			func: B.compose(
				Pair.distrSnd(pair(input, ctx)),
				Pair.second(pair(a, pair(b, ctx)))(f1.func),
			),
		};
	};

export const left =
	<A extends $A, B extends $A>(_input: AEither<A, B>) =>
	<Ctx extends $A, A1 extends $A>(
		_f1: IReader<Ctx, A, A1>,
	): IReader<Ctx, AEither<A, B>, AEither<A1, B>> => {
		throw new Error("TODO");
	};

export const right =
	<A extends $A, B extends $A>(_input: AEither<A, B>) =>
	<Ctx extends $A, B1 extends $A>(
		_f2: IReader<Ctx, B, B1>,
	): IReader<Ctx, AEither<A, B>, AEither<A, B1>> => {
		throw new Error("TODO");
	};

export const leftRight =
	<A extends $A, B extends $A>(_input: AEither<A, B>) =>
	<Ctx extends $A, A1 extends $A, B1 extends $A>(
		_f1: IReader<Ctx, A, A1>,
		_f2: IReader<Ctx, B, B1>,
	): IReader<Ctx, AEither<A, B>, AEither<A1, B1>> => {
		throw new Error("TODO");
	};
