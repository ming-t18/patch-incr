import { makeIFA } from "@/funcs/helpers";
import { type APair, pair } from "@/pair";
import type { $A, IFA } from "@/types";

export const abc_cba = <A extends $A, B extends $A, C extends $A>(
	abc: APair<APair<A, B>, C>,
): IFA<APair<APair<A, B>, C>, APair<APair<C, B>, A>> =>
	makeIFA(
		abc,
		pair(pair(abc.shape[1], abc.shape[0].shape[1]), abc.shape[0].shape[0]),
		{
			evaluate: ([[a, b], c]) => [[c, b], a],
			forward: (_, [ab, c]) => {
				const [a, b] = abc.shape[0].project(null, ab);
				return [[c, b], a];
			},
		},
	);

export const abc_acb = <A extends $A, B extends $A, C extends $A>(
	abc: APair<APair<A, B>, C>,
): IFA<APair<APair<A, B>, C>, APair<APair<A, C>, B>> =>
	makeIFA(
		abc,
		pair(pair(abc.shape[0].shape[0], abc.shape[1]), abc.shape[0].shape[1]),
		{
			evaluate: ([[a, b], c]) => [[a, c], b],
			forward: (_, [ab, c]) => {
				const [a, b] = abc.shape[0].project(null, ab);
				return [[a, c], b];
			},
		},
	);

export const abc_bac = <A extends $A, B extends $A, C extends $A>(
	abc: APair<APair<A, B>, C>,
): IFA<APair<APair<A, B>, C>, APair<APair<B, A>, C>> =>
	makeIFA(
		abc,
		pair(pair(abc.shape[0].shape[1], abc.shape[0].shape[0]), abc.shape[1]),
		{
			evaluate: ([[a, b], c]) => [[b, a], c],
			forward: (_, [ba, c]) => {
				const [b, a] = abc.shape[0].project(null, ba);
				return [[b, a], c];
			},
		},
	);
