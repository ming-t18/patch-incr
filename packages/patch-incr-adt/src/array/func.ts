import { array as A, type AArray, array } from "@/array";
import { type AAtomic, atomic } from "@/atomic";
import { compose, compose1R, composeR } from "@/funcs/basic";
import { makeIF1 } from "@/funcs/helpers";
import { type APair, pair } from "@/pair";
import {
	type $A,
	type $T,
	type IF,
	type IF1,
	type IFA,
	IFKind,
	type IFR,
} from "@/types";
import { SpliceTable } from "./splice";

/** Cumulative sum residual type. */
export type ACsum = AArray<AAtomic<number>>;

export class FArray<A extends $A> {
	constructor(
		readonly inner: A,
		readonly array: AArray<A> = A(inner),
	) {}

	static fromArray<A extends $A>(arr: AArray<A>): FArray<A> {
		return new FArray(arr.inner, arr);
	}

	/**
	 * Scan on a non-incremental function.
	 * The result `r = scan(func, init).evaluate(x)` is defined by
	 * `r[0] = init; r[i] = func(r[i - 1], x[i])`.
	 */
	scan<Acc, AAcc extends AAtomic<Acc>>(
		func: (acc: Acc, value: $T<A>) => Acc,
		init: Acc,
		acc: AAcc,
	): IF1<AArray<A>, AArray<AAcc>> {
		const output = array(acc);
		function evaluateScan(xs: readonly $T<A>[], i0: number, acc0: Acc) {
			let acc = acc0;
			const out: Acc[] = [];
			for (let i = i0; i < xs.length; i++) {
				acc = func(acc, xs[i] as $T<A>);
				out.push(acc);
			}
			return out;
		}
		return makeIF1(this.array, output, {
			evaluate: (xs) => {
				return evaluateScan(xs, 0, init);
			},
			forward: (xs, dxs, ys) => {
				if (dxs.isEmpty) {
					return output.empty;
				}
				const i0 = dxs.firstAffectedIndex;
				if (i0 === null) {
					return output.empty;
				}

				// TODO use xs1.slice(i0) after slicing for SpliceTable is implemented
				const xs1 = this.array.apply(xs, dxs);
				const toDelete = xs.length - i0;
				const acc0 = i0 === 0 ? init : (ys[i0 - 1] as Acc);
				return SpliceTable.fromSplice(
					i0,
					toDelete,
					evaluateScan(xs1, i0, acc0),
				);
			},
		});
	}

	csum<AOut extends AAtomic<number>>(
		func: (value: $T<A>) => number,
		init = 0,
		out = atomic<number>() as AOut,
	): IF1<AArray<A>, AArray<AOut>> {
		return this.scan((s, x) => s + func(x), init, out);
	}

	flat(): IFR<AArray<AArray<A>>, AArray<A>, ACsum> {
		throw new Error("TODO");
	}

	map1<B extends $A>(_func: IFA<A, B> | IF1<A, B>): IF1<AArray<A>, AArray<B>> {
		throw new Error("TODO");
	}

	mapR<B extends $A, R extends $A>(
		_func: IFR<A, B, R>,
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

	filter(_pred: (value: A) => boolean): IFR<AArray<A>, AArray<A>, ACsum> {
		throw new Error("TODO");
	}

	singleton(): IFA<A, AArray<A>> {
		throw new Error("TODO");
	}

	distr<C extends $A>(_c: C): IF<APair<AArray<A>, C>, AArray<APair<A, C>>> {
		throw new Error("TODO");
	}

	distrMap<C extends $A, B extends $A>(
		c: C,
		func: IF<APair<A, C>, B>,
	): IF<APair<AArray<A>, C>, AArray<B>> {
		const a: A = func.input.shape[0];
		return compose(this.distr(c), new FArray(pair(a, c)).map(func));
	}

	distrFlatMap<C extends $A, B extends $A>(
		c: C,
		func: IF<APair<A, C>, AArray<B>>,
	): IF<APair<AArray<A>, C>, AArray<B>> {
		const a: A = func.input.shape[0];
		return compose(this.distr(c), new FArray(pair(a, c)).flatMap(func));
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
