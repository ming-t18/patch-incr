// TODO commented out because it freezes language server
/*
import type { AnyTuple } from "patch-incr/patchSchema/types";
import type { $1, $2 } from "@/hkt/app";

declare module "@/hkt/app" {
	interface $Map1<T0 = unknown> {
		readonly Concat: T0 extends AnyTuple ? T0 : [T0];
	}
	interface $Map2<T0 = unknown, T1 = unknown> {
		readonly Concat: T0 extends AnyTuple
			? T1 extends AnyTuple
				? [...T0, ...T1]
				: [...T0, T1]
			: T1 extends AnyTuple
				? [T0, ...T1]
				: [T0, T1];
	}
	interface $Map3<T0 = unknown, T1 = unknown, T2 = unknown> {
		readonly Concat: [
			...(T0 extends AnyTuple
				? T1 extends AnyTuple
					? [...T0, ...T1]
					: [...T0, T1]
				: T1 extends AnyTuple
					? [T0, ...T1]
					: [T0, T1]),
			...(T2 extends AnyTuple ? T2 : [T2]),
		];
	}
	interface $Map4<T0 = unknown, T1 = unknown, T2 = unknown, T3 = unknown> {
		readonly Concat: [
			...(T0 extends AnyTuple
				? T1 extends AnyTuple
					? [...T0, ...T1]
					: [...T0, T1]
				: T1 extends AnyTuple
					? [T0, ...T1]
					: [T0, T1]),
			...(T2 extends AnyTuple
				? T3 extends AnyTuple
					? [...T2, ...T3]
					: [...T2, T3]
				: T3 extends AnyTuple
					? [T2, ...T3]
					: [T2, T3]),
		];
	}
}

// [string]
export type ConcatTest0 = $1<"Concat", string>;

// [string, number]
export type ConcatTest1 = $2<"Concat", string, number>;

// [string, number]
export type ConcatTest2 = $2<"Concat", string, $1<"Concat", [number]>>;

// [string, bigint, number, symbol]
export type ConcatTest3 = $2<$2<"Concat", string, [bigint]>, number, symbol>;

declare const ConcatTest4: <A, B>() => $2<$2<"Concat", A, B>, number, symbol>;

// ["x", "y", number, symbol]
export type ConcatTest5 = ReturnType<typeof ConcatTest4<"x", "y">>;

export const _concatTest0: ConcatTest0 = ["x"];

export const _concatTest1: ConcatTest1 = ["x", 1];

export const _concatTest2: ConcatTest2 = ["x", 1];

export const _concatTest2_FAIL: ConcatTest2 = [
	// @ts-expect-error mismatching type
	1,
	"x",
];
export const _concatTest3: ConcatTest3 = ["x", 0n, -5, Symbol.for("test")];
export const _concatTest3_FAIL: ConcatTest3 = [
	"x",
	// @ts-expect-error mismatching type
	"y",
	-5,
	Symbol.for("test"),
];
export const _concatTest5: ConcatTest5 = ["x", "y", -5, Symbol.for("test")];
//*/
