import { identity as identityIF } from "../builder";
import {
	compose as _compose,
	composeIFInv,
	composeReeval,
} from "../builder/compose";
import { composeWithInv } from "../builder/compose/noInterm";
import * as Pair from "../builder/pair";
import { isTrivial } from "../hints";
import type { Patches } from "../patch";
import type { IF, IFInv } from "../types";
import type {
	AnyIFR,
	ExistsW,
	IFR,
	IFRHasResidual,
	IFRNoResidual,
} from "./types";

export function isIFInv<A, B, DA = Patches<A>, DB = Patches<B>>(
	func: IF<A, B, DA, DB>,
): func is IFInv<A, B, DA, DB> {
	// @ts-expect-error for checking inverseEvaluate
	return typeof func.inverseEvaluate === "function";
}

export const fromIF = <A, B>(func: IF<A, B>): IFRNoResidual<A, B> => ({
	hasResidual: false,
	func,
});

export const fromIFR = <A, B, W = unknown>(
	func: IF<A, [B, W]>,
): IFRHasResidual<A, B, W> => ({
	hasResidual: true,
	func,
});

export const identity = <A>(): IFRNoResidual<A, A> => fromIF(identityIF());

export const first = <A, B, A1, R>(
	f1: IFR<A, A1, R>,
): IFR<[A, B], [A1, B], R> => {
	if (!f1.hasResidual) {
		return fromIF<[A, B], [A1, B]>(Pair.first(f1.func));
	}

	return fromIFR<[A, B], [A1, B], R>(
		composeWithInv(
			Pair.first(f1.func),
			composeIFInv(
				Pair.assocRight(),
				composeIFInv(Pair.secondInv(Pair.swap()), Pair.assocLeft()),
			),
		),
	);
};

export const second = <A, B, B1, R>(
	f1: IFR<B, B1, R>,
): IFR<[A, B], [A, B1], R> => {
	if (!f1.hasResidual) {
		return fromIF<[A, B], [A, B1]>(Pair.second(f1.func));
	}

	return fromIFR<[A, B], [A, B1], R>(
		composeWithInv(Pair.second(f1.func), Pair.assocLeft()),
	);
};

// TODO firstSecond

// TODO split

export const compose2 = <A, B, C, R1, R2>(
	r1: IFR<A, B, R1>,
	r2: IFR<B, C, R2>,
): IFR<A, C, ExistsW> => {
	if (!r1.hasResidual) {
		if (!r2.hasResidual) {
			// !r1.hasResidual && !r2.hasResidual
			if (isTrivial(r1.func)) {
				return fromIF(composeReeval(r1.func, r2.func));
			}
			if (isIFInv(r2.func)) {
				return fromIF(composeWithInv(r1.func, r2.func));
			}
			return fromIFR(_compose(r1.func, r2.func));
		}

		// !r1.hasResidual && r2.hasResidual
		if (isTrivial(r1.func)) {
			return fromIFR(composeReeval(r1.func, r2.func));
		}
		return fromIFR(
			composeWithInv(_compose(r1.func, r2.func), Pair.assocRight()),
		);
	}

	if (!r2.hasResidual) {
		// r1.hasResidual && !r2.hasResidual
		if (isIFInv(r2.func)) {
			return fromIFR(composeWithInv(r1.func, Pair.firstInv(r2.func)));
		}
		return fromIFR(
			composeWithInv(_compose(r1.func, Pair.first(r2.func)), Pair.assocRight()),
		);
	}
	// r1.hasResidual && r2.hasResidual
	return fromIFR(
		composeWithInv(
			_compose(r1.func, Pair.first(r2.func)),
			composeIFInv(Pair.firstInv(Pair.assocRight()), Pair.assocRight()),
		),
	);
};
export const compose3 = <A, B, C, D, R1, R2, R3>(
	r1: IFR<A, B, R1>,
	r2: IFR<B, C, R2>,
	r3: IFR<C, D, R3>,
): IFR<A, D> => {
	if (!r2.hasResidual && !r3.hasResidual) {
		if (isIFInv(r3.func)) {
			return compose2(compose2(r1, r2), r3);
		}
		return compose2(r1, compose2(r2, r3));
	}
	return compose2(compose2(r1, r2), r3);
};
export const compose4 = <A, B, C, D, E, R1, R2, R3, R4>(
	r1: IFR<A, B, R1>,
	r2: IFR<B, C, R2>,
	r3: IFR<C, D, R3>,
	r4: IFR<D, E, R4>,
): IFR<A, E> => {
	if (!r3.hasResidual && !r4.hasResidual) {
		if (!r2.hasResidual) {
			return compose2(r1, compose3(r2, r3, r4));
		}
		return compose2(compose2(r1, r2), compose2(r3, r4));
	}
	return compose2(compose3(r1, r2, r3), r4);
};

export interface IFRComposeOverloaded {
	<A>(): IFR<A, A>;
	<A, B, R1>(r1: IFR<A, B, R1>): IFR<A, B, R1>;
	<A, B, C, R1, R2>(r1: IFR<A, B, R1>, r2: IFR<B, C, R2>): IFR<A, C>;
	<A, B, C, D, R1, R2, R3>(
		r1: IFR<A, B, R1>,
		r2: IFR<B, C, R2>,
		r3: IFR<C, D, R3>,
	): IFR<A, D>;
	<A, B, C, D, E, R1, R2, R3, R4>(
		r1: IFR<A, B, R1>,
		r2: IFR<B, C, R2>,
		r3: IFR<C, D, R3>,
		r4: IFR<D, E, R4>,
	): IFR<A, E>;
}

export const compose: IFRComposeOverloaded = (...args: AnyIFR[]) => {
	if (args.length === 0) {
		return identity();
	}
	if (args.length === 1) {
		return args[0];
	}
	if (args.length === 2) {
		return compose2(args[1], args[2]);
	}
	if (args.length === 3) {
		return compose3(args[1], args[2], args[3]);
	}
	if (args.length === 4) {
		return compose4(args[1], args[2], args[3], args[4]);
	}
	throw new Error("IFR.compose: too many arguments");
};
