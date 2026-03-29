import type { $1, $2 } from "@/hkt";

declare const F1 = "F1";
type F1 = typeof F1;
declare module "@/hkt/app" {
	interface $Map1<T0 = unknown> {
		readonly [F1]: { test: T0 };
	}

	interface $Map3<T0 = unknown, T1 = unknown, T2 = unknown> {
		readonly [F1]: { test: T0; tup: [T1, T2] };
	}
}

// { test: number } & $Brand<...>
export type Test0 = $1<F1, number>;

// UNRESOLVED & $Brand<...>
export type Test1 = $2<F1, number, string>;

// { test: number; tup: [string, null] } & $Brand<...>
export type Test2 = $1<Test1, null>;

// @ts-expect-error Missing field
export const _test2_FAIL: Test2 = {
	test: -5,
};

export const _test2: Test2 = {
	test: -5,
	tup: ["a", null],
};
