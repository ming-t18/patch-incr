import { identity as id } from "@/builder";
import { composeReeval } from "@/builder/compose";
import * as Either from "@/builder/either";
import * as Option from "@/builder/option";
import * as Pair from "@/builder/pair";
import type { IF } from "@/types";
import { type IPrism, OpticsKind } from "./types";

export const left = <A, B>(): IPrism<Either.Either<A, B>, A, { left: A }> => ({
	kind: OpticsKind.Prism,
	getOpt: Either.elim(Option.just(), Option.nothing()),
	over: (f) => Either.leftRight(f, id()),
	set: composeReeval(
		Either.distRight(),
		Either.leftRight(Pair.snd(), Pair.fst()),
	),
	overCtx: <Ctx>(
		f: IF<[A, Ctx], A>,
	): IF<[Either.Either<A, B>, Ctx], Either.Either<A, B>> =>
		composeReeval(Either.distRight(), Either.leftRight(f, Pair.fst())),
});

export const right = <A, B>(): IPrism<
	Either.Either<A, B>,
	B,
	{ right: B }
> => ({
	kind: OpticsKind.Prism,
	getOpt: Either.elim(Option.nothing(), Option.just()),
	over: (f) => Either.leftRight(id(), f),
	set: composeReeval(
		Either.distRight(),
		Either.leftRight(Pair.fst(), Pair.snd()),
	),
	overCtx: <Ctx>(
		f: IF<[B, Ctx], B>,
	): IF<[Either.Either<A, B>, Ctx], Either.Either<A, B>> =>
		composeReeval(Either.distRight(), Either.leftRight(Pair.fst(), f)),
});
