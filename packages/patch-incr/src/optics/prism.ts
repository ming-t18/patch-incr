import { castOutput, constant, identity as id } from "@/builder";
import { condSingle } from "@/builder/cond";
import * as Option from "@/builder/option";
import * as Pair from "@/builder/pair";
import type { IF } from "@/types";
import { type IPrism, OpticsKind } from "./types";

export const empty = <T, A, F = never>(): IPrism<T, A, F> => ({
	kind: OpticsKind.Prism,
	getOpt: constant<Option.Option<A>, T>(Option.Nothing),
	over: (_f) => id(),
	overCtx: (_f) => Pair.fst(),
	set: Pair.fst(),
});

export const where = <T, TSub extends T = T>(
	pred: (value: T) => boolean,
): IPrism<T, TSub, T extends TSub ? { type: T } : { cast: TSub }> => ({
	kind: OpticsKind.Prism,
	getOpt: castOutput(Option.fromPred<T, TSub>(pred)),
	over: (f) => condSingle(pred, f, id()),
	overCtx: <Ctx>(f: IF<[TSub, Ctx], TSub>): IF<[T, Ctx], T> =>
		condSingle(([x]: [T, Ctx]) => pred(x), castOutput(f), Pair.fst<T, Ctx>()),
	set: condSingle(
		([x]: [T, TSub]) => pred(x),
		Pair.snd<T, TSub>(),
		Pair.fst<T, TSub>(),
	),
});
