import { composeMemo as compose2 } from "patch-incr/builder/compose";
import type { IF } from "patch-incr/types";
import type { EmptyCtx, Ijq } from "./type";

export * as Builder from "patch-incr/builder";
export * as Arr from "patch-incr/builder/array";
export * as Dist from "patch-incr/builder/array/dist";
export {
	composeMemo as compose2,
	composeReeval,
} from "patch-incr/builder/compose";
export * as Pair from "patch-incr/builder/pair";

export const compose3 = <A extends WeakKey, B, C, D>(
	f1: IF<A, B>,
	f2: IF<B, C>,
	f3: IF<C, D>,
) => compose2(compose2(f1, f2), f3);

export const hole_ = <A, B, Ctx extends {} = EmptyCtx>(): Ijq<A, B, Ctx> => {
	throw new Error("TODO: hole");
};
