import fc from "fast-check";
import * as C from "@/constant";
import { type AAtomicWithGen, atomicWithGen } from "./gen";

export const constant = <T>(value: T): C.AConstant<T, null> =>
	C.constant(value, null);
export const boolean = (): AAtomicWithGen<boolean> =>
	atomicWithGen(fc.boolean());
export const string = (opts?: fc.StringConstraints): AAtomicWithGen<string> =>
	atomicWithGen(fc.string(opts));
export const integer = (opts?: fc.IntegerConstraints): AAtomicWithGen<number> =>
	atomicWithGen(fc.integer(opts));
export const bigInt = (
	opts?: fc.BigIntConstraints | undefined,
): AAtomicWithGen<bigint> =>
	atomicWithGen(opts ? fc.bigInt(opts) : fc.bigInt());
