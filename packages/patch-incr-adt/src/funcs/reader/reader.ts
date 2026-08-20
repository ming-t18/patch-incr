import * as B from "@/funcs/basic";
import { type APair, pair } from "@/pair";
import { FPair } from "@/pair/func";
import type { $A, IF } from "@/types";

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

export const arr = <Ctx extends $A, A extends $A, B extends $A>(
	ctx: Ctx,
	f: IF<A, B>,
): IReader<Ctx, A, B> => ({
	usesCtx: false,
	ctx,
	func: f,
});

export const fromReader = <Ctx extends $A, A extends $A, B extends $A>(
	f: IF<APair<A, Ctx>, B>,
): IReader<Ctx, A, B> => ({ usesCtx: true, func: f });

export const identity = <Ctx extends $A, A extends $A>(
	ctx: Ctx,
	input: A,
): IReader<Ctx, A, A> => ({
	usesCtx: false,
	ctx,
	func: B.identity(input),
});

export const passthru = <Ctx extends $A, A extends $A, B extends Ctx>(
	ctx: Ctx,
	f: IReader<Ctx, A, B>,
): IReader<Ctx, A, APair<B, Ctx>> => {
	if (!f.usesCtx) {
		const ta: A = f.func.input;
		return {
			usesCtx: true,
			func: new FPair(pair(ta, ctx)).first<B>(f.func),
		};
	}
	const a: A = f.func.input.shape[0];
	const b: B = B.getOutput(f.func);
	return {
		usesCtx: true,
		func: new FPair(pair(b, ctx)).from_fork(
			f.func,
			new FPair(pair(a, ctx)).snd(),
		),
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
			func: B.compose(new FPair(pair(a, ctx)).first<B>(f1.func), f2.func),
		};
	}
	const a: A = f1.func.input.shape[0];
	const b: B = f2.usesCtx ? f2.func.input.shape[0] : f2.func.input;
	const ctx: Ctx = f1.func.input.shape[1];
	const left: IF<APair<A, Ctx>, APair<B, Ctx>> = new FPair(
		pair(b, ctx),
	).from_fork(f1.func, new FPair(pair(a, ctx)).snd());
	if (!f2.usesCtx) {
		return {
			usesCtx: true,
			func: B.compose(left, B.compose(new FPair(pair(b, ctx)).fst(), f2.func)),
		};
	}

	return {
		usesCtx: true,
		func: B.compose(left, f2.func),
	};
};

export const first = <
	Ctx extends $A,
	A extends $A,
	B extends $A,
	A1 extends $A,
>(
	b: B,
	f1: IReader<Ctx, A, A1>,
): IReader<Ctx, APair<A, B>, APair<A1, B>> => {
	if (!f1.usesCtx) {
		const a: A = f1.func.input;
		return {
			usesCtx: false,
			ctx: f1.ctx,
			func: new FPair(pair(a, b)).first(f1.func),
		};
	}
	const a: A = f1.func.input.shape[0];
	const ctx: Ctx = f1.func.input.shape[1];
	const fi = new FPair(pair(pair(a, b), ctx));
	const fp1 = new FPair(pair(pair(a, ctx), b));
	return {
		usesCtx: true,
		func: B.compose(fi.distrFst(), fp1.first<A1>(f1.func)),
	};
};
