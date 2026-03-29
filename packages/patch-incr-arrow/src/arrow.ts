import type { Either } from "patch-incr/builder/either";
import type { Option } from "patch-incr/builder/option";
import type { IF } from "patch-incr/types";
import type { $2 } from "./hkt";

export type ComposeBase<T, Base> = <A extends Base, B, C>(
	f1: $2<T, A, B>,
	f2: $2<T, B, C>,
) => $2<T, A, C>;

export interface IACompose<T> {
	identity<A>(): $2<T, A, A>;
	/** `arr` */
	fromIF<A, B>(f1: IF<A, B>): $2<T, A, B>;
	/** `(>>>)`, with `f1` memoed with WeakMap. */
	compose: ComposeBase<T, WeakKey>;
	/** `(>>>)`, with f1 re-evaluated when calling `forward`. */
	composeReeval: ComposeBase<T, unknown>;
}

export interface IAComposeResidual<T> {
	composeR<A, B, C>(f1: $2<T, A, B>, f2: $2<T, B, C>): $2<T, A, [B, C]>;
}

export interface IAPlus<T> {
	empty<A, B>(): $2<T, A, B>;
	plus<A, B>(f1: $2<T, A, B>, f2: $2<T, A, B>): $2<T, A, B>;
	sum<A, B>(fs: $2<T, A, B>[]): $2<T, A, B>;
}

export interface IAPair<T> {
	fst<A, B>(): $2<T, [A, B], A>;
	snd<A, B>(): $2<T, [A, B], B>;
	first<A, B, A1>(f1: $2<T, A, A1>): $2<T, [A, B], [A1, B]>;
	second<A, B, B1>(f2: $2<T, B, B1>): $2<T, [A, B], [A, B1]>;
	/** `(***)` */
	firstSecond<A, B, A1, B1>(
		f1: $2<T, A, A1>,
		f2: $2<T, B, B1>,
	): $2<T, [A, B], [A1, B1]>;
	/** `(&&&)` */
	pair<A, B, C>(f1: $2<T, A, B>, f2: $2<T, A, C>): $2<T, A, [B, C]>;
	distr<A, B, C>(): $2<T, [[A, B], C], [[A, C], [B, C]]>;
}

export interface IAChoice<T> {
	left<A, B, A1>(f1: $2<T, A, A1>): $2<T, Either<A, B>, Either<A1, B>>;
	right<A, B, B1>(f2: $2<T, B, B1>): $2<T, Either<A, B>, Either<A, B1>>;
	/** `(+++)` */
	leftRight<A, B, A1, B1>(
		f1: $2<T, A, A1>,
		f2: $2<T, B, B1>,
	): $2<T, Either<A, B>, Either<A1, B1>>;
	/** `(|||)` */
	elim<A, B, C>(f1: $2<T, A, C>, f2: $2<T, B, C>): $2<T, Either<A, B>, C>;
	distr<A, B, C>(): $2<T, [Either<A, B>, C], Either<[A, C], [B, C]>>;
}

export type IAOption<T> = {
	just<A, B>(f1: $2<T, A, B>): $2<T, A, [B]>;
	compose<A extends WeakKey, B, C>(
		f1: $2<T, A, Option<B>>,
		f2: $2<T, B, Option<C>>,
	): $2<T, A, Option<C>>;
	map<A, B>(f1: $2<T, A, B>): $2<T, Option<A>, Option<B>>;
	flatMap<A, B>(f1: $2<T, A, Option<B>>): $2<T, Option<A>, Option<B>>;
	distr<A, B>(): $2<T, [Option<A>, B], Option<[A, B]>>;
};

export interface IAArray<T> {
	map<A, B>(f1: $2<T, A, B>): $2<T, A[], B[]>;
	flatMap<A, B>(f1: $2<T, A, B[]>): $2<T, A[], B[]>;
	distr<A, B>(): $2<T, [A[], B], [A, B][]>;
}

export interface IAImpls<T> {
	// plus: IAPlus<T>;
	pair: IAPair<T>;
	choice: IAChoice<T>;
	option: IAOption<T>;
	array: IAArray<T>;
}
