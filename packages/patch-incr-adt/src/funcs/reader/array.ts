import type { AArray } from "@/array";
import { FArray } from "@/array/func";
import type { $A } from "@/types";
import type { IReader } from "./reader";

export const map = <Ctx extends $A, A extends $A, B extends $A>(
	f1: IReader<Ctx, A, B>,
): IReader<Ctx, AArray<A>, AArray<B>> => {
	if (!f1.usesCtx) {
		const a: A = f1.func.input;
		const arrA = new FArray(a);
		return {
			usesCtx: false,
			ctx: f1.ctx,
			func: arrA.map(f1.func),
		};
	}
	const a: A = f1.func.input.shape[0];
	const ctx: Ctx = f1.func.input.shape[1];
	const arrA = new FArray(a);
	return {
		usesCtx: true,
		func: arrA.distrMap(ctx, f1.func),
	};
};

export const flatMap = <Ctx extends $A, A extends $A, B extends $A>(
	f1: IReader<Ctx, A, AArray<B>>,
): IReader<Ctx, AArray<A>, AArray<B>> => {
	if (!f1.usesCtx) {
		const a: A = f1.func.input;
		const arrA = new FArray(a);
		return {
			usesCtx: false,
			ctx: f1.ctx,
			func: arrA.flatMap(f1.func),
		};
	}
	const a: A = f1.func.input.shape[0];
	const ctx: Ctx = f1.func.input.shape[1];
	const arrA = new FArray(a);
	return {
		usesCtx: true,
		func: arrA.distrFlatMap(ctx, f1.func),
	};
};
