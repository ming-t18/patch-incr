import type { AArray } from "@/array";
import type { IReader } from "@/funcs/reader";
import * as R from "@/funcs/reader";
import type { APair } from "@/pair";
import type { $A, IF } from "@/types";

export interface IjqSingle<Ctx extends $A, A extends $A, B extends $A> {
	isMulti: false;
	func: IReader<Ctx, A, B>;
}

export interface IjqMulti<Ctx extends $A, A extends $A, B extends $A> {
	isMulti: true;
	func: IReader<Ctx, A, AArray<B>>;
}

export type Ijq<Ctx extends $A, A extends $A, B extends $A> =
	| IjqSingle<Ctx, A, B>
	| IjqMulti<Ctx, A, B>;

export const arr = <Ctx extends $A, A extends $A, B extends $A>(
	ctx: Ctx,
	func: IF<A, B>,
): Ijq<Ctx, A, B> => ({
	isMulti: false,
	func: R.arr<Ctx, A, B>(ctx, func),
});

export const fromSingleCtx = <Ctx extends $A, A extends $A, B extends $A>(
	func: IF<APair<A, Ctx>, B>,
): Ijq<Ctx, A, B> => ({
	isMulti: false,
	func: R.fromReader<Ctx, A, B>(func),
});

export const fromMultiCtx = <Ctx extends $A, A extends $A, B extends $A>(
	func: IF<APair<A, Ctx>, AArray<B>>,
): Ijq<Ctx, A, B> => ({
	isMulti: true,
	func: R.fromReader<Ctx, A, AArray<B>>(func),
});

export const identity = <Ctx extends $A, A extends $A>(
	ctx: Ctx,
	input: A,
): Ijq<Ctx, A, A> => ({
	isMulti: false,
	func: R.identity(ctx, input),
});

export const compose = <
	Ctx extends $A,
	A extends $A,
	B extends $A,
	C extends $A,
>(
	f1: Ijq<Ctx, A, B>,
	f2: Ijq<Ctx, B, C>,
): Ijq<Ctx, A, C> => {
	if (!f1.isMulti) {
		if (!f2.isMulti) {
			return { isMulti: false, func: R.compose(f1.func, f2.func) };
		}
		return { isMulti: true, func: R.compose(f1.func, f2.func) };
	}
	if (!f2.isMulti) {
		return {
			isMulti: true,
			func: R.compose(f1.func, R.Array.map(f2.func)),
		};
	}

	return {
		isMulti: true,
		func: R.compose(f1.func, R.Array.flatMap(f2.func)),
	};
};

// export const first = <
// 	Ctx extends $A,
// 	A extends $A,
// 	B extends $A,
// 	A1 extends $A,
// >(
// 	b: B,
// 	f1: Ijq<Ctx, A, B>,
// ): Ijq<Ctx, APair<A, B>, APair<A1, B>> => {
// 	const a = R.getTypes(f1.func)[1];
// 	if (!f1.isMulti) {
// 		return {
// 			isMulti: false,
// 			func: R.first(f1.func),
// 		};
// 	}
// };
