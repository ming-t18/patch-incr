import type { IAReader } from "@/arrowTransformer";
import type { $ } from "@/hkt";
import {
	type ImplsArrowListInput,
	type ImplsArrowListOutputBasic,
	ListKind,
	type ListT$,
} from "./types";

export const deriveReader = <T, Ctx>(
	args: ImplsArrowListOutputBasic<T> & { reader: IAReader<Ctx, T> },
): IAReader<Ctx, ListT$<T>> => {
	const {
		trans: { lift },
		reader: r,
	} = args;
	return {
		read: <A>(): $<ListT$<T>, [A, Ctx]> => lift(r.read()),
		newReader: <A, B>(f: $<ListT$<T>, [A, B]>): $<ListT$<T>, [[A, Ctx], B]> => {
			if (f.kind === ListKind.Single) {
				return {
					kind: ListKind.Single,
					get: r.newReader(f.get),
				};
			}
			if (f.kind === ListKind.Optional) {
				return {
					kind: ListKind.Optional,
					getOpt: r.newReader(f.getOpt),
				};
			}
			return {
				kind: ListKind.Multiple,
				getMulti: r.newReader(f.getMulti),
			};
		},
	};
};
