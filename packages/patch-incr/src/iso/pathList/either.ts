import * as E from "@/builder/either";
import type { Either } from "../either";
import * as Builder from "./builder";
import type { PathListOptics } from "./types";

export const onLeft = <A, B>(): PathListOptics<Either<A, B>, A> => ({
	func: E.elim(Builder.identity<A>().func, Builder.empty<B, A>().func),
	acceptPath: (path) => path,
});

export const onRight = <A, B>(): PathListOptics<Either<A, B>, B> => ({
	func: E.elim(Builder.empty<A, B>().func, Builder.identity<B>().func),
	acceptPath: (path) => path,
});
