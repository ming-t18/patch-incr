import { describe } from "bun:test";
import * as f from "@/funcs";
import * as s from "@/index";
import { Either, Pair } from "@/index";
import { FPair } from "@/pair/func";
import * as p from "@/props";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";
import { testCasesIdentity, testCasesIFA } from "./fastCheck/testPropsIF.test";

const pair1 = Pair.pair(p.boolean(), p.integer());
const pairNested1 = Pair.pair(pair1, p.string());
const pairNested2 = Pair.pair(
	pair1.shape[0],
	Pair.pair(pair1.shape[1], pairNested1.shape[1]),
);
const pairComplex = Pair.pair(
	Either.either(p.boolean(), p.integer()),
	s.record({
		single: s.record({ bool: p.boolean() }),
		int: p.integer(),
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
		const c = p.boolean();
		testCasesIFA(new FPair(pair1).distrFst<typeof c>(c));
	});

	describe("undistrFst", () => {
		const c = p.boolean();
		testCasesIFA(new FPair(pair1).undistrFst<typeof c>(c));
	});

	describe("distrSnd", () => {
		const c = p.boolean();
		testCasesIFA(new FPair(pair1).distrSnd<typeof c>(c));
	});

	describe("undistrSnd", () => {
		const c = p.boolean();
		testCasesIFA(new FPair(pair1).undistrSnd<typeof c>(c));
	});
});
