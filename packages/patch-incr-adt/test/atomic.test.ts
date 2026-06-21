import fc from "fast-check";
import { atomicWithGen } from "@/props/gen";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";

describe("atomic", () => {
	describe("boolean", () => {
		testCasesPropsApply(atomicWithGen(fc.boolean()));
	});

	describe("bigint", () => {
		testCasesPropsApply(atomicWithGen(fc.bigInt()));
	});

	describe("string", () => {
		testCasesPropsApply(atomicWithGen(fc.string()));
	});
});
