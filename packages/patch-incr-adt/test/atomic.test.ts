import { describe, it } from "bun:test";
import * as s from "@/index";
import * as p from "@/props";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";

describe("atomic", () => {
	it.skip("type checking on arb", () => {
		const _shouldFailTypeCheck = [
			// @ts-expect-error arbValue must fail type constraint
			s.boolean().getArbApply(),
		];
		const _shouldPassTypeCheck = [p.boolean().getArbApply()];
	});

	describe("boolean", () => {
		testCasesPropsApply(p.boolean());
	});

	describe("bigint", () => {
		testCasesPropsApply(p.bigInt());
	});

	describe("string", () => {
		testCasesPropsApply(p.string());
	});
});
