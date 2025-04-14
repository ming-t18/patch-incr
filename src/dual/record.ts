import type { StructuralChangeBuilder } from "../incr/builder";
import { type DP, dp } from "./types";

export type ToRecord<T extends Record<string, DP>> = {
	[key in keyof T]: T[key][0];
};

export const record =
	<T extends Record<string, DP>, DT>({
		combine,
		liftKey: lift,
		empty,
	}: StructuralChangeBuilder<unknown, DT>) =>
	(rec: T): DP<ToRecord<T>, DT> => {
		const keys = Object.keys(rec);
		return dp(
			keys.reduce((o, k) => {
				// @ts-expect-error assignment by key
				o[k] = rec[k][0];
				return o;
			}, {} as T),
			keys.reduce((d, k) => combine(d, lift(k, rec[k][1])), empty),
		);
	};
