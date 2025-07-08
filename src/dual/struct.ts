import { liftPatch, type Patches } from "../incr/patch";
import { dp, dp0 } from "./dp";
import type { DP } from "./types";

export type DFTupleReturn<Ys extends DP<unknown>[]> = Ys extends []
	? []
	: Ys extends [DP<infer Y0, unknown>, ...infer Rest extends DP<any, any>[]]
		? [Y0, ...DFTupleReturn<Rest>]
		: never;

export type DFRecordReturn<R extends Record<string, DP<any, any>>> = {
	[key in keyof R]: R[key][0];
};

export const dfTuple = <Args extends DP<unknown>[]>(
	...args: Args
): DP<DFTupleReturn<Args>> => {
	let hasChange = false;
	const n = args.length;
	const out = Array(n).fill(null) as never as DFTupleReturn<Args>;
	for (let i = 0; i < n; i++) {
		hasChange ||= args[i][2];
		out[i] = args[i][0] as never;
	}

	if (!hasChange) {
		return dp0(out);
	}

	const combined: Patches<DFTupleReturn<Args>> = [];
	for (let i = 0; i < n; i++) {
		combined.push(...(liftPatch(i, args[i][1] ?? []) as Patches<never>));
	}
	return dp(out, combined);
};

export const dfRecord = <Args extends Record<string, DP<unknown>>>(
	args: Args,
): DP<DFRecordReturn<Args>> => {
	let hasChange = false;
	const keys = Object.keys(args);
	const out = {} as DFRecordReturn<Args>;
	for (const key of keys) {
		hasChange ||= args[key][2];
		// @ts-expect-error
		out[key] = args[key][0];
	}

	if (!hasChange) {
		return dp0(out);
	}

	const combined: Patches<DFRecordReturn<Args>> = [];
	for (const key of keys) {
		combined.push(...(liftPatch(key, args[key][1] ?? []) as Patches<never>));
	}
	return dp(out, combined);
};
