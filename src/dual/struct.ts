import type {
	StructuralChangeBuilder,
	TupleOrRecord,
	patchesBuilder,
} from "../incr/builder";
import { type DP, dp, isDP } from "./types";

const keys = <Obj extends TupleOrRecord, K extends keyof Obj>(xs: Obj) => {};

type M1<T extends unknown[] | Record<string, unknown>> = {
	[k in keyof T]: { value: T[k] };
};

type Test = M1<[string, number]>;

export type StructReturnArray<T extends unknown[]> = T extends []
	? []
	: T extends [infer Head, infer Tail extends unknown[]]
		? [StructReturn<Head>, ...StructReturnArray<Tail>]
		: T;

export type StructReturn<T> = T extends DP
	? T[0]
	: T extends unknown[] | Record<string, unknown>
		? { [k in keyof T]: StructReturn<T> }
		: never;

export const struct = <T, DT>(builder: StructuralChangeBuilder<T, DT>) => {
	const { combine, liftKey, liftIndex, empty } = builder;
	return (obj: T): DP<StructReturn<T>, DT> => {
		const sb = struct(builder);
		if (isDP(obj)) {
			return obj as DP as never;
		}

		if (Array.isArray(obj)) {
			return dp(
				obj.map((v) => (isDP(v) ? v[0] : sb(v)[0])) as never,
				obj.reduce(
					(d, v, i) =>
						combine(d, liftIndex(i, (isDP(v) ? (v as never) : sb(v))[1])),
					empty,
				),
			);
		}

		if (obj !== null && typeof obj === "object") {
			const keys = Object.keys(obj);
			return dp(
				keys.reduce((o, k) => {
					// @ts-expect-error value
					const v = obj[k];
					// @ts-expect-error assignment by key
					o[k] = isDP(v) ? v[0] : sb(v)[0];
					return o;
				}, {} as T) as never,
				keys.reduce((d, k) => {
					// @ts-expect-error indexing by key
					const v = obj[k];
					return combine(d, liftKey(k, (isDP(v) ? v : sb(v))[1] as never));
				}, empty),
			);
		}

		return dp(obj, empty) as DP<never, never>;
	};
};
