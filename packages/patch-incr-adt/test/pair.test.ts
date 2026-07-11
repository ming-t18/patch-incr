import { describe } from "bun:test";
import fc from "fast-check";
import * as f from "@/funcs";
import * as s from "@/index";
import { Either, Pair } from "@/index";
import { FPair } from "@/pair/func";
import { atomicWithGen } from "@/props/gen";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";
import { testCasesIdentity, testCasesIFA } from "./fastCheck/testPropsIF.test";

const pair1 = Pair.pair(
	atomicWithGen(fc.boolean()),
	atomicWithGen(fc.integer()),
);
const pairNested1 = Pair.pair(pair1, atomicWithGen(fc.string()));
const pairNested2 = Pair.pair(
	pair1.shape[0],
	Pair.pair(pair1.shape[1], pairNested1.shape[1]),
);
const pairComplex = Pair.pair(
	Either.either(atomicWithGen(fc.boolean()), atomicWithGen(fc.integer())),
	s.record({
		single: s.record({ bool: atomicWithGen(fc.boolean()) }),
		int: atomicWithGen(fc.integer()),
	}),
);

describe("pair", () => {
	describe("[boolean, integer]", () => {
		testCasesPropsApply(pair1);
	});
	describe("[[boolean, integer], string]", () => {
		testCasesPropsApply(pairNested1);
	});
	describe("[boolean, [integer, string]]", () => {
		testCasesPropsApply(pairNested2);
	});
	describe("complex", () => {
		testCasesPropsApply(pairComplex);
	});
});

describe("FPair", () => {
	describe("comm", () => {
		testCasesIFA(new FPair(pair1).comm0());
		describe("compose with inverse", () => {
			const { fwd, inv } = new FPair(pair1).comm();
			testCasesIdentity(f.composeA(fwd, inv));
		});
	});

	describe("distrFst", () => {
		const c = atomicWithGen(fc.boolean());
		testCasesIFA(new FPair(pair1).distrFst<typeof c>(c));
	});

	describe("undistrFst", () => {
		const c = atomicWithGen(fc.boolean());
		testCasesIFA(new FPair(pair1).undistrFst<typeof c>(c));
	});

	describe("distrSnd", () => {
		const c = atomicWithGen(fc.boolean());
		testCasesIFA(new FPair(pair1).distrSnd<typeof c>(c));
	});

	describe("undistrSnd", () => {
		const c = atomicWithGen(fc.boolean());
		testCasesIFA(new FPair(pair1).undistrSnd<typeof c>(c));
	});
});
