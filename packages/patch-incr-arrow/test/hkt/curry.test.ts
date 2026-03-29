import type { $1, $2, $3, $4, Tuple } from "@/hkt";

export type Test1 = $1<Tuple, number>;

export type Test11 = $1<$1<Tuple, 1>, 2>;
export type Test12 = $1<$2<Tuple, 1, 2>, 3>;
export type Test13 = $1<$3<Tuple, 1, 2, 3>, 4>;

// UNRESOLVED & Brand<...>
export type Test14 = $1<$4<Tuple, 1, 2, 3, 4>, 5>;

export type Test21 = $2<$1<Tuple, 1>, 2, 3>;
export type Test22 = $2<$2<Tuple, 1, 2>, 3, 4>;

// UNRESOLVED & Brand<...>
export type Test23 = $1<$3<Tuple, 1, 2, 3>, 4>;

export type Test31 = $3<$1<Tuple, 1>, 2, 3, 4>;

// UNRESOLVED & Brand<...>
export type Test32 = $3<$2<Tuple, 1, 2>, 3, 4, 5>;

// @ts-expect-error [1, 1] not assignable to [1, 2]
export const _test11_FAIL: Test11 = [1, 1];

export const _test11: Test11 = [1, 2];
export const _test12: Test12 = [1, 2, 3];
export const _test13: Test13 = [1, 2, 3, 4];
export const _test21: Test21 = [1, 2, 3];
export const _test22: Test22 = [1, 2, 3, 4];
export const _test23: Test23 = [1, 2, 3, 4];
