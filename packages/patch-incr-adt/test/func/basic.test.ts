import { describe, test } from "bun:test";
import fc from "fast-check";
import * as f from "@/funcs";
import * as s from "@/index";
import * as p from "@/props";
import {
	testCasesConstant,
	testCasesIdentity,
	testCasesIF,
	testCasesIFA,
} from "../fastCheck/testPropsIF.test";

describe("identity", () => {
	const idb = f.identity(p.boolean());
	const idr = f.identity(
		s.record({
			num: p.integer(),
			bool: p.boolean(),
			str: p.string(),
		}),
	);
	const idu = f.identity(
		s.union(
			{
				num: p.integer(),
				bool: p.boolean(),
				str: p.string(),
			},
			(x) =>
				typeof x === "number" ? "num" : typeof x === "string" ? "str" : "bool",
		),
	);
	describe("boolean", () => {
		testCasesIFA(idb);
		testCasesIdentity(idb);
	});
	describe("record", () => {
		testCasesIFA(idr);
		testCasesIdentity(idr);
	});
	describe("union", () => {
		testCasesIFA(idu);
		testCasesIdentity(idu);
	});
});

describe("constant", () => {
	const c = f.constant(p.string(), p.boolean(), true);
	testCasesIFA(c);
	testCasesConstant(true, c);
});

describe("atomicFuncA", () => {
	describe("effectively constant", () => {
		const constAtomic = f.atomicFuncA(p.integer(), p.string(), (_) => "test");
		test("evaluate returns the constant value", () => {
			fc.assert(
				fc.property(
					p.genValueFromApply(constAtomic.input),
					(x) => constAtomic.evaluate(x) === "test",
				),
			);
		});
		test("forward returns empty change", () => {
			fc.assert(
				fc.property(
					p.genValueFromApply(constAtomic.input),
					p.genChangeFromApply(constAtomic.input),
					(x, dx) => constAtomic.output.isEmpty(constAtomic.forward(x, dx)),
				),
			);
		});
		testCasesIFA(constAtomic);
	});

	describe("unary function", () => {
		const toUpper = f.atomicFuncA(p.string(), p.string(), (x) =>
			x.toUpperCase(),
		);
		test("forward returns empty change for input change causing output to be unchanged", () => {
			fc.property(fc.string(), (s) =>
				toUpper.output.isEmpty(
					toUpper.forward(s, toUpper.input.fromReplace(s.toLowerCase())),
				),
			);
		});
		testCasesIFA(toUpper);
	});
});

describe("atomicFunc", () => {
	describe("effectively constant", () => {
		const constAtomic = f.atomicFunc(p.integer(), p.string(), (_) => "test");
		test("evaluate returns the constant value", () => {
			fc.assert(
				fc.property(
					p.genValueFromApply(constAtomic.input),
					(x) => constAtomic.evaluate(x) === "test",
				),
			);
		});
		test("forward returns empty change", () => {
			fc.assert(
				fc.property(
					p.genValueFromApply(constAtomic.input),
					p.genChangeFromApply(constAtomic.input),
					(x, dx) =>
						constAtomic.output.isEmpty(
							constAtomic.forward(x, dx, constAtomic.evaluate(x)),
						),
				),
			);
		});
		testCasesIF(constAtomic);
	});

	describe("unary function", () => {
		const toUpper = f.atomicFunc(p.string(), p.string(), (x) =>
			x.toUpperCase(),
		);
		test("forward returns empty change for input change causing output to be unchanged", () => {
			fc.property(fc.string(), (s) =>
				toUpper.output.isEmpty(
					toUpper.forward(
						s,
						toUpper.input.fromReplace(s.toLowerCase()),
						toUpper.evaluate(s),
					),
				),
			);
		});
		testCasesIF(toUpper);
	});
});
