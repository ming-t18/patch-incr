import type { Measure } from "./types";

export const addNumber = {
	zero: 0,
	combine: (a: number, b: number): number => a + b,
};

export const addBigint = {
	zero: 0n,
	combine: (a: bigint, b: bigint): bigint => a + b,
};

export const length = <T>(): Measure<T, number> => ({
	...addNumber,
	measure: (_: T) => 1,
});

export const sum = (): Measure<number, number> => ({
	...addNumber,
	measure: (a) => a,
});

export const sumBigint = (): Measure<bigint, bigint> => ({
	...addBigint,
	measure: (a) => a,
});

export const product = (): Measure<number, number> => ({
	zero: 1,
	measure: (a) => a,
	combine: (a, b) => a * b,
});

export const productBigint = (): Measure<bigint, bigint> => ({
	zero: 1n,
	measure: (a) => a,
	combine: (a, b) => a * b,
});
