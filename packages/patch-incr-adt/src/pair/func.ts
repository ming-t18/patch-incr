import { makeIFA } from "@/funcs/helpers";
import type { Apply } from "@/types";
import type { $A, $D, $T } from "@/types/abbr";
import type { IFA } from "@/types/func/incrFunc";
import type { IIsoA } from "@/types/func/iso";
import { type APair, pair } from ".";

export class FPair<
	A extends Apply<TA, DA>,
	B extends Apply<TB, DB>,
	TA = $T<A>,
	TB = $T<B>,
	DA = $D<A>,
	DB = $D<B>,
> {
	constructor(readonly pair: APair<A, B>) {}

	flipped(): APair<B, A> {
		return pair(this.pair.shape[1], this.pair.shape[0]);
	}

	fst(): IFA<APair<A, B>, A> {
		return makeIFA(this.pair, this.pair.shape[0], {
			evaluate: ([a, _]) => a,
			forward: (_p, [da, _db]) => da,
		});
	}

	snd(): IFA<APair<A, B>, B> {
		return makeIFA(this.pair, this.pair.shape[1], {
			evaluate: ([_, b]) => b,
			forward: (_p, [_da, db]) => db,
		});
	}

	comm0(): IFA<APair<A, B>, APair<B, A>> {
		return makeIFA(this.pair, pair(this.pair.shape[1], this.pair.shape[0]), {
			evaluate: ([a, b]) => [b, a],
			forward: (_p, [da, db]) => [db, da],
		});
	}

	comm(): IIsoA<APair<A, B>, APair<B, A>> {
		return {
			fwd: this.comm0(),
			inv: new FPair(this.flipped()).comm0(),
		};
	}

	distrFst<C extends $A>(
		c: C,
	): IFA<APair<APair<A, B>, C>, APair<APair<A, C>, B>> {
		return makeIFA(
			pair(this.pair, c),
			pair(pair(this.pair.shape[0], c), this.pair.shape[1]),
			{
				evaluate: ([[a, b], c]) => [[a, c], b],
				forward: (_p, [dab, dc]) => {
					const [da, db] = this.pair.project(null, dab);
					return [[da, dc], db];
				},
			},
		);
	}

	undistrFst<C extends $A>(
		c: C,
	): IFA<APair<APair<A, C>, B>, APair<APair<A, B>, C>> {
		const pac = pair(this.pair.shape[0], c);
		return makeIFA(pair(pac, this.pair.shape[1]), pair(this.pair, c), {
			evaluate: ([[a, c], b]) => [[a, b], c],
			forward: (_p, [dac, db]) => {
				const [da, dc] = pac.project(null, dac);
				return [[da, db], dc];
			},
		});
	}

	distrSnd<C extends $A>(
		c: C,
	): IFA<APair<APair<A, B>, C>, APair<A, APair<B, C>>> {
		return makeIFA(
			pair(this.pair, c),
			pair(this.pair.shape[0], pair(this.pair.shape[1], c)),
			{
				evaluate: ([[a, b], c]) => [a, [b, c]],
				forward: (_p, [dab, dc]) => {
					if (this.pair.isEmpty(dab)) {
						return [this.pair.shape[0].empty, [this.pair.shape[1].empty, dc]];
					}
					const [da, db] = this.pair.project(null, dab);
					return [da, [db, dc]];
				},
			},
		);
	}

	undistrSnd<C extends $A>(
		c: C,
	): IFA<APair<A, APair<B, C>>, APair<APair<A, B>, C>> {
		const pbc = pair(this.pair.shape[1], c);
		return makeIFA(pair(this.pair.shape[0], pbc), pair(this.pair, c), {
			evaluate: ([a, [b, c]]) => [[a, b], c],
			forward: (_p, [da, dbc]) => {
				const [db, dc] = pbc.project(null, dbc);
				return [[da, db], dc];
			},
		});
	}
}
