import { identity as id } from "patch-incr/builder";
import * as Arr from "patch-incr/builder/array";
import { distr } from "patch-incr/builder/array/dist";
import {
	composeMemo,
	compose as composeR,
	composeReeval,
} from "patch-incr/builder/compose";
import * as Either from "patch-incr/builder/either";
import * as Option from "patch-incr/builder/option";
import * as Pair from "patch-incr/builder/pair";
import type { IF } from "patch-incr/types";
import type {
	IAArray,
	IAChoice,
	IACompose,
	IAComposeResidual,
	IAOption,
	IAPair,
} from "@/arrow";
import type { Identity } from "@/hkt";

declare module "@/hkt/app" {
	interface $Map2<T0, T1> {
		readonly [Identity]: IF<T0, T1>;
	}
}

export const fromIF = <A, B>(x: IF<A, B>) => x;
export const compose = composeMemo;
export const identity = id;

export const composeResidual = composeR;

export const arrowCompose: IACompose<Identity> = {
	fromIF,
	compose,
	composeReeval,
	identity,
};

export const arrowComposeResidual: IAComposeResidual<Identity> = {
	composeR,
};

export const arrowPair: IAPair<Identity> = {
	fst: Pair.fst,
	snd: Pair.snd,
	first: Pair.first,
	second: Pair.second,
	firstSecond: Pair.firstSecond,
	pair: Pair.pair,
	distr: Pair.distr,
};

export const arrowChoice: IAChoice<Identity> = {
	left: Either.left,
	right: Either.right,
	leftRight: Either.leftRight,
	elim: Either.elim,
	distr: Either.distRight,
};

export const arrowOption: IAOption<Identity> = {
	just: Option.just,
	compose: Option.compose,
	map: Option.map,
	flatMap: Option.flatMap,
	distr: Option.distr,
};

export const arrowArray: IAArray<Identity> = {
	map: Arr.map,
	flatMap: Arr.flatMapSingle,
	distr,
};
