import { type DP, dp } from ".";

export type ToTuple<T extends DP[]> = T extends []
	? []
	: T extends [infer V extends DP, ...infer Rest extends DP[]]
		? [V[0], ...ToTuple<Rest>]
		: never;

export const tuple =
	<T extends DP[], DT, DC = T[number & keyof T][1]>({
		combine,
		liftIndex: lift,
		empty,
	}: {
		liftIndex: (key: number & keyof T, change: DC) => DT;
		combine: (a: DT, b: DT) => DT;
		empty: DT;
	}) =>
	(tup: T): DP<ToTuple<T>, DT> => {
		return dp(
			tup.map((v) => v[0]) as never,
			tup.reduce((d, v, i) => combine(d, lift(i, v[1] as DC)), empty),
		);
	};
