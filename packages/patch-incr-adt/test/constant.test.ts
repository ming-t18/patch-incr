import * as s from "@/index";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";

describe("constant", () => {
	describe("constant(null, null)", () => {
		testCasesPropsApply(s.constant(null, null));
	});

	describe("constant('test', null)", () => {
		testCasesPropsApply(s.constant("test", null));
	});

	describe("constant('test', 'test')", () => {
		testCasesPropsApply(s.constant("test", "test"));
	});

	describe("constant('test', true)", () => {
		testCasesPropsApply(s.constant("test", true));
	});
});
