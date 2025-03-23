import type { StructuralChangeBuilder } from "../incr/builder";
import { type DP, dp } from "./types";

export type ToRecord<T extends Record<string, DP>> = {
	[key in keyof T]: T[key][0];
};

export const record =
	<T extends Record<string, DP>, DT, DC = T[keyof T][1]>({
		combine,
		liftKey: lift,
		empty,
	}: StructuralChangeBuilder<T, DT>) =>
	(rec: T): DP<ToRecord<T>, DT> => {
		const keys = Object.keys(rec);
		return dp(
			keys.reduce((o, k) => {
				// @ts-expect-error assignment by key
				o[k] = rec[k][0];
				return o;
			}, {} as T),
			keys.reduce((d, k) => {
				// @ts-expect-error indexing by key
				return combine(d, lift(k, rec[k][1]));
			}, empty),
		);
	};
