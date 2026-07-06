import { describe, it } from "bun:test";
import fc from "fast-check";
import * as s from "@/index";
import { atomicWithGen } from "@/props/gen";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";

describe("atomic", () => {
	it.skip("type checking on arb", () => {
		const _shouldFailTypeCheck = [
			// @ts-expect-error arbValue must fail type constraint
			s.boolean().arbValue(),
			// @ts-expect-error arbChange must fail type constraint
			s.boolean().arbChange(),
		];
		const _shouldPassTypeCheck = [
			atomicWithGen(fc.boolean()).arbValue(),
			atomicWithGen(fc.boolean()).arbChange(),
		];
	});

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
