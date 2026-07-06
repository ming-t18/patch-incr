import { describe } from "bun:test";
import fc from "fast-check";
import { FEither } from "@/either/func";
import * as f from "@/funcs";
import * as s from "@/index";
import { atomicWithGen } from "@/props/gen";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";
import { testCasesIdentity, testCasesIFA } from "./fastCheck/testPropsIF.test";

const eitherIntegerString = s.either(
	atomicWithGen(fc.integer()),
	atomicWithGen(fc.string()),
);

describe("either apply", () => {
	describe("const/const", () => {
		testCasesPropsApply(s.either(s.constant(0, null), s.constant(1, null)));
	});
	describe("integer/integer", () => {
		testCasesPropsApply(
			s.either(atomicWithGen(fc.integer()), atomicWithGen(fc.integer())),
		);
	});
	describe("integer/string", () => {
		testCasesPropsApply(eitherIntegerString);
	});
	describe("nested", () => {
		testCasesPropsApply(
			s.either(
				s.either(atomicWithGen(fc.integer()), atomicWithGen(fc.string())),
				s.either(atomicWithGen(fc.boolean()), atomicWithGen(fc.integer())),
			),
		);
	});
	describe("string/record", () => {
		testCasesPropsApply(
			s.either(
				atomicWithGen(fc.string()),
				s.record({ int: atomicWithGen(fc.integer()) }),
			),
		);
	});
	describe("record/string", () => {
		testCasesPropsApply(
			s.either(
				s.record({ int: atomicWithGen(fc.integer()) }),
				atomicWithGen(fc.string()),
			),
		);
	});
	describe("record/record", () => {
		testCasesPropsApply(
			s.either(
				s.record({ int: atomicWithGen(fc.integer()) }),
				s.record({ str: atomicWithGen(fc.string()) }),
			),
		);
	});
});

describe("either", () => {
	const fe = new FEither(eitherIntegerString);
	describe("left", () => {
		testCasesIFA(fe.left());
	});
	describe("right", () => {
		testCasesIFA(fe.left());
	});
	describe("comm", () => {
		testCasesIFA(fe.comm0());
		describe("comm . comm is identity", () => {
			const id1 = f.composeA(fe.comm0(), new FEither(fe.flipped()).comm0());
			testCasesIFA(id1);
			testCasesIdentity(id1);
		});
	});
	describe("assoc", () => {
		const a = atomicWithGen(fc.integer());
		const b = atomicWithGen(fc.string());
		const c = atomicWithGen(fc.boolean());
		const _u1 = s.either(a, s.either(b, c));
		const _u2 = s.either(s.either(a, b), c);
		const f1 = f.assocRL(a, b, c);
		const f2 = f.assocLR(a, b, c);
		describe("assocLR patch coherence", () => {
			testCasesIFA(f1);
		});
		describe("assocRL patch coherence", () => {
			testCasesIFA(f2);
		});
		describe("composeA(assocRL, assocLR) is identity", () => {
			const id1 = f.composeA(f1, f2);
			testCasesIFA(id1);
			testCasesIdentity(id1);
		});
	});
});
