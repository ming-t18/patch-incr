// biome-ignore-all lint/style/noNonNullAssertion: for checked array access
import { describe } from "bun:test";
import * as s from "@/index";
import * as p from "@/props";
import { testCasesIF } from "../fastCheck/testPropsIF.test";

describe("csum", () => {
	const arrInt = s.array(p.integer());
	testCasesIF(s.FArray.fromArray(arrInt).csum((x) => x, 0, p.integer()));
});
