import * as E from "@/builder/either";
import type { Either } from "../either";
import * as Builder from "./builder";
import type { PathListOptics } from "./types";

export const onLeft = <A, B>(): PathListOptics<Either<A, B>, A> =>
	E.elim(Builder.identity(), Builder.empty());

export const onRight = <A, B>(): PathListOptics<Either<A, B>, B> =>
	E.elim(Builder.empty(), Builder.identity());
