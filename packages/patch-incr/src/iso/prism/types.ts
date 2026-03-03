import type { Either } from "@/builder/either";
import type { IIso } from "../types";

export type IIsoPrism<A, B, R = any> = IIso<A, Either<B, R>>;

export type AnyIIsoPrism = IIsoPrism<any, any, any>;

export interface IIsoPrismFamily<A, B, S, T, R = any> {
	match: IIsoPrism<S, A, R>;
	inject: IIsoPrism<T, B, R>;
}
