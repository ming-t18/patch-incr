import { identity as id } from "@/builder";
import * as Either from "@/builder/either";
import * as Option from "@/builder/option";
import { type IPrism, OpticsKind } from "./types";

export const left = <A, B>(): IPrism<Either.Either<A, B>, A> => ({
	kind: OpticsKind.Prism,
	getOpt: Either.elim(Option.just(), Option.nothing()),
	set: (f) => Either.leftRight(f, id()),
});

export const right = <A, B>(): IPrism<Either.Either<A, B>, B> => ({
	kind: OpticsKind.Prism,
	getOpt: Either.elim(Option.nothing(), Option.just()),
	set: (f) => Either.leftRight(id(), f),
});
