import type { Either } from "@/builder/either";
import type { IIso } from "../types";

// TODO change R to unknown

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type IIsoPrism<A, B, R = any> = IIso<A, Either<B, R>>;

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyIIsoPrism = IIsoPrism<any, any, any>;

// biome-ignore lint/suspicious/noExplicitAny: intentional
export interface IIsoPrismFamily<A, B, S, T, R = any> {
	match: IIsoPrism<S, A, R>;
	inject: IIsoPrism<T, B, R>;
}
