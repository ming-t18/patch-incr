/** biome-ignore-all lint/style/noNonNullAssertion: for indexing arrays */
import { array as A, type AArray, array } from "@/array";
import { type AAtomic, atomic } from "@/atomic";
import { compose, compose1R, composeR } from "@/funcs/basic";
import { makeIF1, makeIFR } from "@/funcs/helpers";
import { type APair, pair } from "@/pair";
import { getReplaceOnly } from "@/replaceOnly";
import {
	type $A,
	type $D,
	type $T,
	type IF,
	type IF1,
	type IFA,
	IFKind,
	type IFR,
} from "@/types";
import {
	type ApplyEntry,
	type SpliceEntry,
	SpliceTable,
	type SpliceTableEntry,
} from "./splice";

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

	/** Flattens an array at depth 1. The residual is the cumulative sum of array lengths. */
	flat(): IFR<AArray<AArray<A>>, AArray<A>, ACsum> {
		const csum: IF1<AArray<AArray<A>>, ACsum> = new FArray(this.array).csum(
			(xs) => xs.length,
		);
		const getOff = (csum: readonly number[], i: number): number =>
			i === 0 ? 0 : csum[i - 1]!;
		return makeIFR(array(this.array), this.array, csum.output, {
			evaluate: (xss: $T<AArray<AArray<A>>>): $T<APair<AArray<A>, ACsum>> => [
				xss.flat(1),
				csum.evaluate(xss),
			],
			forward: (xss, dxss, [_ys, ss]) => {
				const dss = csum.forward(xss, dxss, ss);
				const ss1 = csum.output.apply(ss, dss);
				const dys = new SpliceTable<$T<AArray<A>>, $D<AArray<A>>>(
					dxss.entries.flatMap(
						(
							entryParent: SpliceTableEntry<$T<AArray<A>>, $D<AArray<A>>>,
						): SpliceTableEntry<$T<A>, $D<A>>[] => {
							const { i: ixs, j: jxs } = entryParent;
							const i1 = getOff(ss, ixs);
							const j1 = getOff(ss1, jxs);
							if ("replace" in entryParent) {
								const flattened: $T<AArray<A>> = entryParent.replace.flat(1);
								const di1 = getOff(ss, ixs + entryParent.di) - i1;
								return [
									{
										i: i1,
										di: di1,
										j: j1,
										dj: flattened.length,
										replace: flattened,
									} satisfies SpliceEntry<$T<A>>,
								];
							}

							const dxs = entryParent.change;
							if (this.array.isEmpty(dxs)) {
								return [];
							}
							const r = this.array.isReplace(dxs);
							if (r !== null) {
								const replace = getReplaceOnly(r);
								return [
									{
										i: i1,
										di: xss[ixs]!.length,
										j: j1,
										dj: replace.length,
										replace,
									},
								];
							}

							return (dxs as SpliceTable<$T<A>, $D<A>>).entries.map(
								(
									entryChild: SpliceTableEntry<$T<A>, $D<A>>,
								): SpliceTableEntry<$T<A>, $D<A>> => {
									const i = getOff(ss, ixs) + entryChild.i;
									const j = getOff(ss1, jxs) + entryChild.j;
									if ("change" in entryChild) {
										// a sub-array has changed
										return {
											i,
											di: 1,
											j,
											dj: 1,
											change: entryChild.change,
										} satisfies ApplyEntry<$D<A>>;
									}
									return {
										i,
										di: entryChild.di,
										j,
										dj: entryChild.replace.length,
										replace: entryChild.replace,
									} satisfies SpliceEntry<$T<A>>;
								},
							);
						},
					),
				);
				return [dys, dss];
			},
		});
	}

	map1<B extends $A>(func: IFA<A, B> | IF1<A, B>): IF1<AArray<A>, AArray<B>> {
		return makeIF1(this.array, array(func.output), {
			evaluate: (xs: $T<AArray<A>>): $T<AArray<B>> =>
				xs.map((x) => func.evaluate(x)),
			forward: (xs, dxs, ys) =>
				dxs.map({
					evaluate: (_i, x) => func.evaluate(x),
					forward: (i, dx) => func.forward(xs[i], dx, ys[i]),
				}),
		});
	}

	mapR<B extends $A, R extends $A>(
		func: IFR<A, B, R>,
	): IFR<AArray<A>, AArray<B>, AArray<R>> {
		const outArray: AArray<B> = array(func.output.shape[0]);
		const outResidual: AArray<R> = array(func.output.shape[1]);

		const outPair: APair<B, R> = func.output;
		return makeIFR(this.array, outArray, outResidual, {
			evaluate: (xs: $T<AArray<A>>): $T<APair<AArray<B>, AArray<R>>> => {
				const pairs = xs.map((x) => func.evaluate(x));
				return [pairs.map((p) => p[0]), pairs.map((p) => p[1])];
			},
			forward: (xs, dxs, [ys, rs]) => {
				const dPairs = dxs.map({
					evaluate: (_i, x) => func.evaluate(x),
					forward: (i, dx) => func.forward(xs[i], dx, [ys[i], rs[i]]),
				});
				const dys: SpliceTable<$T<B>, $D<B>> = dPairs.map({
					evaluate: (_i, p) => p[0],
					forward: (_i, dp) => outPair.forwardGet("0", dp),
				});
				const drs: SpliceTable<$T<R>, $D<R>> = dPairs.map({
					evaluate: (_i, p) => p[1],
					forward: (_i, dp) => outPair.forwardGet("1", dp),
				});
				return [dys, drs];
			},
		});
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
