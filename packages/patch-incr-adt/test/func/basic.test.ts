import fc from "fast-check";
import * as f from "@/funcs";
import * as s from "@/index";
import { atomicWithGen } from "@/props";
import {
	testCasesConstant,
	testCasesIdentity,
	testCasesIFA,
} from "../fastCheck/testPropsIF.test";

describe("identity", () => {
	const idb = f.identity(atomicWithGen(fc.boolean()));
	const idr = f.identity(
		s.record({
			num: atomicWithGen(fc.integer()),
			bool: atomicWithGen(fc.boolean()),
			str: atomicWithGen(fc.string()),
		}),
	);
	const idu = f.identity(
		s.union(
			{
				num: atomicWithGen(fc.integer()),
				bool: atomicWithGen(fc.boolean()),
				str: atomicWithGen(fc.string()),
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
	const c = f.constant(
		atomicWithGen(fc.string()),
		atomicWithGen(fc.boolean()),
		true,
	);
	testCasesIFA(c);
	testCasesConstant(true, c);
});
