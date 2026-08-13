import type { AArray } from "@/array";
import type { AAtomic } from "@/atomic";
import { compose1R, composeR } from "@/funcs/basic";
import type { APair } from "@/pair";
import {
	type $A,
	type $T,
	type IF,
	type IF1,
	type IFA,
	IFKind,
	type IFR,
} from "@/types";

/** Cumulative sum residual type. */
export type ACsum = AArray<AAtomic<number>>;

export class FArray<A extends $A> {
	constructor(readonly apply: A) {}
	/**
	 * Scan on a non-incremental function.
	 * The result `r = scan(func, init).evaluate(x)` is defined by
	 * `r[0] = init; r[i] = func(r[i - 1], x[i])`.
	 */
	scan<Acc>(
		func: (acc: Acc, value: $T<A>) => Acc,
		init: Acc,
	): IF1<AArray<A>, AArray<AAtomic<Acc>>> {
		throw new Error("TODO");
	}

	flat(): IFR<AArray<AArray<A>>, AArray<A>, ACsum> {
		throw new Error("TODO");
	}

	map1<B extends $A>(func: IFA<A, B> | IF1<A, B>): IF1<AArray<A>, AArray<B>> {
		throw new Error("TODO");
	}

	mapR<B extends $A, R extends $A>(
		func: IFR<A, B, R>,
	): IFR<AArray<A>, AArray<B>, AArray<R>> {
		throw new Error("TODO");
	}

	map<B extends $A>(func: IF<A, B>): IF<AArray<A>, AArray<B>> {
		if (func.kind === IFKind.IFR) {
			return this.mapR(func);
		}
		return this.map1(func);
	}

	flatMapR<B extends $A, R extends $A>(
		func: IFR<A, AArray<B>, R>,
	): IFR<
		AArray<A>,
		AArray<B>,
		APair<APair<AArray<AArray<B>>, AArray<R>>, ACsum>
	> {
		return composeR(
			this.mapR(func),
			new FArray<B>(func.output.shape[0].inner).flat(),
		);
	}

	flatMap1<B extends $A>(
		func: IFA<A, AArray<B>> | IF1<A, AArray<B>>,
	): IFR<AArray<A>, AArray<B>, APair<AArray<AArray<B>>, ACsum>> {
		return compose1R(this.map1(func), new FArray<B>(func.output.inner).flat());
	}

	flatMap<B extends $A>(func: IF<A, AArray<B>>): IF<AArray<A>, AArray<B>> {
		if (func.kind === IFKind.IFR) {
			return this.flatMapR(func);
		}
		return this.flatMap1(func);
	}

	filter(pred: (value: A) => boolean): IFR<AArray<A>, AArray<A>, ACsum> {
		throw new Error("TODO");
	}
}

export class FArrayZip<A extends $A, B extends $A> {
	constructor(
		readonly a: A,
		readonly b: B,
	) {}
	zip(): IF1<APair<AArray<A>, AArray<B>>, AArray<APair<A, B>>> {
		throw new Error("TODO");
	}

	unzip(): IF1<APair<AArray<A>, AArray<B>>, AArray<APair<A, B>>> {
		throw new Error("TODO");
	}
}
