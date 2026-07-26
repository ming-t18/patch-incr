import fc from "fast-check";
import { type AtomicWithGen, atomicWithGen } from "./gen";

export const boolean = (): AtomicWithGen<boolean> =>
	atomicWithGen(fc.boolean());
export const string = (opts?: fc.StringConstraints): AtomicWithGen<string> =>
	atomicWithGen(fc.string(opts));
export const integer = (opts?: fc.IntegerConstraints): AtomicWithGen<number> =>
	atomicWithGen(fc.integer(opts));
export const bigInt = (opts: fc.BigIntConstraints): AtomicWithGen<bigint> =>
	atomicWithGen(fc.bigInt(opts));
