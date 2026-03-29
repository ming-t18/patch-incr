import type { $1, $2, $3, $4, Tuple } from "@/hkt";

// [1] & $Brand<...>
export type TestTuple1 = $1<Tuple, 1>;

// [1, 2] & $Brand<...>
export type TestTuple2 = $2<Tuple, 1, 2>;

// [1, 2, 3] & $Brand<...>
export type TestTuple3 = $3<Tuple, 1, 2, 3>;

// [1, 2, 3, 4] & $Brand<...>
export type TestTuple4 = $4<Tuple, 1, 2, 3, 4>;

export const _testTuple1: TestTuple1 = [1];
export const _testTuple2: TestTuple2 = [1, 2];
export const _testTuple3: TestTuple3 = [1, 2, 3];
export const _testTuple4: TestTuple4 = [1, 2, 3, 4];

// @ts-expect-error Shouldn't match
export const _testTuple4_FAIL: TestTuple4 = [1, 2];
