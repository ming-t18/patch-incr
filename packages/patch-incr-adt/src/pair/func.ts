import { makeIFA } from "@/funcs/helpers";
import type { Apply } from "@/types";
import type { $A, $D, $T } from "@/types/abbr";
import type { IF, IFA } from "@/types/func/incrFunc";
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

	firstA<A1 extends $A>(_f1: IFA<A, A1>): IFA<APair<A, B>, APair<A1, B>> {
		throw new Error("TODO");
	}

	first<A1 extends $A>(_f1: IF<A, A1>): IF<APair<A, B>, APair<A1, B>> {
		throw new Error("TODO");
	}

	from_fork<In extends $A>(
		_f1: IF<In, A>,
		_f2: IF<In, B>,
	): IF<In, APair<A, B>> {
		throw new Error("TODO");
	}

	distrFst<A extends $A, B extends $A, C extends $A>(
		this: FPair<APair<A, B>, C>,
	): IFA<APair<APair<A, B>, C>, APair<APair<A, C>, B>> {
		const b: B = this.pair.shape[0].shape[1];
		const pac: APair<A, C> = pair(
			this.pair.shape[0].shape[0],
			this.pair.shape[1],
		);
		return makeIFA(this.pair, pair(pac, b), {
			evaluate: ([[a, b], c]) => [[a, c], b],
			forward: (_p, [dab, dc]) => {
				const [da, db] = this.pair.project(null, dab);
				return [[da, dc], db];
			},
		});
	}

	undistrFst<A extends $A, B extends $A, C extends $A>(
		this: FPair<APair<A, C>, B>,
	): IFA<APair<APair<A, C>, B>, APair<APair<A, B>, C>> {
		const c: C = this.pair.shape[0].shape[1];
		const pab: APair<A, B> = pair(
			this.pair.shape[0].shape[0],
			this.pair.shape[1],
		);
		const pac: APair<A, C> = pair(this.pair.shape[0].shape[0], c);
		return makeIFA(this.pair, pair(pab, c), {
			evaluate: ([[a, c], b]) => [[a, b], c],
			forward: (_p, [dac, db]) => {
				const [da, dc] = pac.project(null, dac);
				return [[da, db], dc];
			},
		});
	}

	distrSnd<A extends $A, B extends $A, C extends $A>(
		this: FPair<APair<A, B>, C>,
	): IFA<APair<APair<A, B>, C>, APair<A, APair<B, C>>> {
		const [
			{
				shape: [a, b],
			},
			c,
		] = this.pair.shape;
		const pbc: APair<B, C> = pair(b, c);
		return makeIFA(this.pair, pair(a, pbc), {
			evaluate: ([[a, b], c]) => [a, [b, c]],
			forward: (_p, [dab, dc]) => {
				if (this.pair.isEmpty(dab)) {
					return [a.empty, [b.empty, dc]];
				}
				const [da, db] = this.pair.project(null, dab);
				return [da, [db, dc]];
			},
		});
	}

	undistrSnd<A extends $A, B extends $A, C extends $A>(
		this: FPair<A, APair<B, C>>,
	): IFA<APair<A, APair<B, C>>, APair<APair<A, B>, C>> {
		const [
			a,
			{
				shape: [b, c],
			},
		] = this.pair.shape;
		const pab = pair(a, b);
		const pbc = pair(b, c);
		return makeIFA(this.pair, pair(pab, c), {
			evaluate: ([a, [b, c]]) => [[a, b], c],
			forward: (_p, [da, dbc]) => {
				const [db, dc] = pbc.project(null, dbc);
				return [[da, db], dc];
			},
		});
	}
}
