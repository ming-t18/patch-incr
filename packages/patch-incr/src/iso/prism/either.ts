import * as Builder from "../builder";
import type { Either } from "../either";
import * as E from "../either";
import type { IIsoPrism } from "./types";

export const left = <A, B>(): IIsoPrism<Either<A, B>, A, B> =>
	Builder.identity();
export const right = <A, B>(): IIsoPrism<Either<A, B>, B, A> => E.flip();
