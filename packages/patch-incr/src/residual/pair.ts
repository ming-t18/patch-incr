import { composeWithInv } from "@/builder/compose/noInterm";
import * as Pair from "@/builder/pair";
import type { ExistsW, IFR } from "./types";

export const first = <A, B, A1, W = ExistsW>(
	f1: IFR<A, A1, W>,
): IFR<[A, B], [A1, B], W> => {
	if (!f1.hasResidual) {
		return {
			hasResidual: false,
			func: Pair.first(f1.func),
		};
	}
	return {
		hasResidual: true,
		func: composeWithInv(Pair.first(f1.func), Pair.abc_acb()),
	};
};

export const second = <A, B, B1, W = ExistsW>(
	f2: IFR<B, B1, W>,
): IFR<[A, B], [A, B1], W> => {
	if (!f2.hasResidual) {
		return {
			hasResidual: false,
			func: Pair.second(f2.func),
		};
	}
	return {
		hasResidual: true,
		func: composeWithInv(Pair.second(f2.func), Pair.assocLeft()),
	};
};

export const firstSecond = <A, B, A1, B1, W1 = ExistsW, W2 = ExistsW>(
	f1: IFR<A, A1, W1>,
	f2: IFR<B, B1, W2>,
): IFR<[A, B], [A1, B1]> => {
	if (!f1.hasResidual) {
		if (!f2.hasResidual) {
			return {
				hasResidual: false,
				func: Pair.firstSecond(f1.func, f2.func),
			};
		}

		return {
			hasResidual: true,
			func: composeWithInv(
				Pair.firstSecond(f1.func, f2.func),
				Pair.assocLeft(),
			),
		};
	}

	if (!f2.hasResidual) {
		return {
			hasResidual: true,
			func: composeWithInv(Pair.firstSecond(f1.func, f2.func), Pair.abc_acb()),
		};
	}

	return {
		hasResidual: true,
		func: composeWithInv(Pair.firstSecond(f1.func, f2.func), Pair.abcd_acdb()),
	};
};

export const pair = <A, B, C, W1 = ExistsW, W2 = ExistsW>(
	f1: IFR<A, B, W1>,
	f2: IFR<A, C, W2>,
): IFR<A, [B, C]> => {
	if (!f1.hasResidual) {
		if (!f2.hasResidual) {
			return {
				hasResidual: false,
				func: Pair.pair(f1.func, f2.func),
			};
		}

		return {
			hasResidual: true,
			func: composeWithInv(Pair.pair(f1.func, f2.func), Pair.assocLeft()),
		};
	}

	if (!f2.hasResidual) {
		return {
			hasResidual: true,
			func: composeWithInv(Pair.pair(f1.func, f2.func), Pair.abc_acb()),
		};
	}

	return {
		hasResidual: true,
		func: composeWithInv(Pair.pair(f1.func, f2.func), Pair.abcd_acdb()),
	};
};
