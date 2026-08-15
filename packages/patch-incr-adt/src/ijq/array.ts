import type { AArray } from "@/array";
import { FArray } from "@/array/func";
import * as R from "@/funcs/reader";
import type { $A } from "@/types";
import type { Ijq } from "./ijq";

export const collect = <Ctx extends $A, A extends $A, B extends $A>(
	f1: Ijq<Ctx, A, B>,
): Ijq<Ctx, A, AArray<B>> => {
	if (!f1.isMulti) {
		const [ctx, _a, b] = R.getTypes(f1.func);
		return {
			isMulti: false,
			func: R.compose(f1.func, R.arr(ctx, new FArray(b).singleton())),
		};
	}
	return {
		isMulti: false,
		func: f1.func,
	};
};

// export const map = <Ctx extends $A, A extends $A, B extends $A>(
// 	f1: Ijq<Ctx, A, B>,
// ): Ijq<Ctx, AArray<A>, AArray<B>> => {};

// export const flatMap = <Ctx extends $A, A extends $A, B extends $A>(
// 	f1: Ijq<Ctx, A, B>,
// ): Ijq<Ctx, AArray<A>, AArray<B>> => {};
