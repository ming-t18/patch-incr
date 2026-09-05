import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import * as f from "@/funcs";
import * as s from "@/index";
import { Either } from "@/modules";
import * as p from "@/props";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";
import { testCasesIdentity, testCasesIFA } from "./fastCheck/testPropsIF.test";

const eitherIntegerString = s.either(p.integer(), p.string());

describe("either apply", () => {
	describe("const/const", () => {
		testCasesPropsApply(s.either(s.constant(0, null), s.constant(1, null)));
	});
	describe("integer/integer", () => {
		testCasesPropsApply(s.either(p.integer(), p.integer()));
	});
	describe("integer/string", () => {
		testCasesPropsApply(eitherIntegerString);
	});
	describe("nested", () => {
		testCasesPropsApply(
			s.either(
				s.either(p.integer(), p.string()),
				s.either(p.boolean(), p.integer()),
			),
		);
	});
	describe("string/record", () => {
		testCasesPropsApply(s.either(p.string(), s.record({ int: p.integer() })));
	});
	describe("record/string", () => {
		testCasesPropsApply(s.either(s.record({ int: p.integer() }), p.string()));
	});
	describe("record/record", () => {
		testCasesPropsApply(
			s.either(s.record({ int: p.integer() }), s.record({ str: p.string() })),
		);
	});
});

describe("either", () => {
	describe("introLeft", () => {
		testCasesIFA(Either.introLeft(eitherIntegerString));
	});
	describe("introRight", () => {
		testCasesIFA(Either.introRight(eitherIntegerString));
	});
	describe("comm", () => {
		testCasesIFA(Either.comm(eitherIntegerString));
		describe("comm . comm is identity", () => {
			const id1 = f.composeA(
				Either.comm(eitherIntegerString),
				Either.comm(Either.flip(eitherIntegerString)),
			);
			testCasesIFA(id1);
			testCasesIdentity(id1);
		});
	});
	describe("assoc", () => {
		const a = p.integer();
		const b = p.string();
		const c = p.boolean();
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
	describe("leftToOption", () => {
		describe("string/integer", () => {
			const input = s.either(p.string(), p.integer());
			const fn = Either.leftToOption(input);
			test("evaluate", () => {
				fc.assert(
					fc.property(p.genValueFromApply(input), (x) => {
						const y = fn.evaluate(x);
						if (Either.isLeft(x)) {
							expect(y).toEqual({ value: x.left });
						} else {
							expect(y).toEqual(null);
						}
					}),
				);
			});
			testCasesIFA(fn);
		});
		testCasesIFA(
			Either.leftToOption(
				s.either(s.pair(p.string(), p.boolean()), p.integer()),
			),
		);
	});
	describe("rightToOption", () => {
		describe("string/integer", () => {
			const input = s.either(p.string(), p.integer());
			const fn = Either.rightToOption(input);
			test("evaluate", () => {
				fc.assert(
					fc.property(p.genValueFromApply(input), (x) => {
						const y = fn.evaluate(x);
						if (Either.isLeft(x)) {
							expect(y).toEqual(null);
						} else {
							expect(y).toEqual({ value: x.right });
						}
					}),
				);
			});
			testCasesIFA(fn);
		});
		testCasesIFA(
			Either.rightToOption(
				s.either(p.integer(), s.pair(p.string(), p.boolean())),
			),
		);
	});
});
