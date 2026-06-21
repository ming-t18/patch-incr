import fc from "fast-check";
import * as s from "@/index";
import {
	atomicWithGen,
	genChangeFromApply,
	genValueFromApply,
} from "@/props/gen";
import { propCanApplyApplies } from "./testPropsApply.test";

const item = s.record({
	done: atomicWithGen(fc.boolean()),
	text: atomicWithGen(fc.string()),
	nested: s.record({
		a: atomicWithGen(fc.string()),
		b: atomicWithGen(fc.integer()),
	}),
});

const union = s.union(
	{
		boolean: atomicWithGen(fc.boolean()),
		string: atomicWithGen(fc.string()),
	},
	(x) => typeof x as "string" | "boolean",
);

const either = s.Either.either(
	item,
	s.record({ b: atomicWithGen(fc.string()) }),
);

// const listItem = s.list(item);

describe("record", () => {
	it("should generate record", () => {
		fc.assert(
			fc.property(genValueFromApply(item), (item) => {
				expect(typeof item).toBe("object");
				expect(typeof item.done).toBe("boolean");
				expect(typeof item.text).toBe("string");
			}),
		);
	});

	it("should generate record change", () => {
		fc.assert(
			fc.property(genValueFromApply(item), genChangeFromApply(item), (v, d) => {
				return propCanApplyApplies(item, v, d);
			}),
		);
	});
});

describe("union", () => {
	it("should generate union", () => {
		fc.assert(
			fc.property(genValueFromApply(union), (u) => {
				return typeof u === "boolean" || typeof u === "string";
			}),
		);
	});

	it("should generate union change", () => {
		fc.assert(
			fc.property(
				genValueFromApply(union),
				genChangeFromApply(union),
				(v, d) => {
					return propCanApplyApplies(union, v, d);
				},
			),
		);
	});
});

describe("either", () => {
	it("should generate either change", () => {
		fc.assert(
			fc.property(
				genValueFromApply(either),
				genChangeFromApply(either),
				(v, d) => {
					return propCanApplyApplies(either, v, d);
				},
			),
			{ verbose: true },
		);
	});
});
