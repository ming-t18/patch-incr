import { describe } from "bun:test";
import * as f from "@/funcs";
import * as s from "@/index";
import { Either, Pair } from "@/index";
import * as p from "@/props";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";
import { testCasesIdentity, testCasesIFA } from "./fastCheck/testPropsIF.test";

const pair1 = s.pair(p.boolean(), p.integer());
const pairNested1 = s.pair(pair1, p.string());
const pairNested2 = s.pair(
	pair1.shape[0],
	s.pair(pair1.shape[1], pairNested1.shape[1]),
);
const pairComplex = s.pair(
	Either.either(p.boolean(), p.integer()),
	s.record({
		single: s.record({ bool: p.boolean() }),
		int: p.integer(),
	}),
);

describe("pair apply", () => {
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

describe("pair functions", () => {
	describe("comm and commIso", () => {
		testCasesIFA(Pair.comm(pair1));
		describe("compose with inverse", () => {
			const { fwd, inv } = Pair.commIso(pair1);
			testCasesIdentity(f.composeA(fwd, inv));
		});
	});
	describe("assoc and assocIso", () => {
		const pairA = pairNested1;
		testCasesIFA(Pair.assocLR(pairA));
		describe("compose with inverse", () => {
			const { fwd, inv } = Pair.assocIso(pairA);
			testCasesIdentity(f.composeA(fwd, inv));
		});
	});
	describe("fst", () => {
		testCasesIFA(Pair.fst(s.pair(p.boolean(), p.string())));
	});
	describe("snd", () => {
		testCasesIFA(Pair.snd(s.pair(p.boolean(), p.string())));
	});

	describe("distrFst", () => {
		const c = p.boolean();
		testCasesIFA(Pair.distrFst(s.pair(pair1, c)));
	});

	describe("undistrFst", () => {
		const c = p.boolean();
		testCasesIFA(Pair.undistrFst(s.pair(pair1, c)));
	});

	describe("distrSnd", () => {
		const c = p.boolean();
		const input = Pair.distrFst(s.pair(pair1, c)).output;
		testCasesIFA(Pair.distrSnd(input));
	});

	describe("undistrSnd", () => {
		const c = p.boolean();
		const input = Pair.distrSnd(s.pair(pair1, c)).output;
		testCasesIFA(Pair.undistrSnd(input));
	});
});
