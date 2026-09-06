import { type AArray, distl, distr, flatMap } from "@/array";
import { composer } from "@/funcs/compose/chain";
import type { APair } from "@/pair";
import type { $A, IF } from "@/types";

export const cartesian = <A extends $A, B extends $A>(
	input: APair<AArray<A>, AArray<B>>,
): IF<APair<AArray<A>, AArray<B>>, AArray<APair<A, B>>> => {
	const aa: AArray<A> = input.shape[0];
	const ab: AArray<B> = input.shape[1];
	return composer(distr<A, AArray<B>>(aa, ab))
		.pipe((t) =>
			flatMap<APair<A, AArray<B>>>(t)(
				distl<A, B>(t.inner.shape[0], t.inner.shape[1]),
			),
		)
		.build();
};
