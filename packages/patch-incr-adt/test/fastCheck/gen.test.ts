import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import * as s from "@/index";
import type { ArbApply } from "@/props";
import {
	atomicWithGen,
	genChangeFromApply,
	genValueFromApply,
} from "@/props/gen";
import { propCanApplyApplies } from "./testPropsApply.test";

const recordEmpty = s.record({});

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

const optional = s.optional(item);

describe("empty record", () => {
	test("correct type of getArbApply", () => {
		const _ = recordEmpty.getArbApply satisfies () => ArbApply<
			typeof recordEmpty
		>;
	});

	test("generate record", () => {
		fc.assert(
			fc.property(genValueFromApply(recordEmpty), (item) => {
				expect(typeof item).toBe("object");
				expect(Object.keys(item)).toHaveLength(0);
			}),
		);
	});

	test("generate record change", () => {
		fc.assert(
			fc.property(
				genValueFromApply(recordEmpty),
				genChangeFromApply(recordEmpty),
				(v, d) => {
					return propCanApplyApplies(recordEmpty, v, d);
				},
			),
		);
	});
});

describe("record with no arb", () => {
	const itemNoArb = s.record({
		done: s.atomic<boolean>(),
		text: atomicWithGen(fc.string()),
	});
	const itemNoArb1 = s.record({
		done: s.atomic<boolean>(),
	});
	const itemHasArbRec = s.record({
		done: s.recBrand(s.atomic<boolean>()),
	});

	test("correct type of getArbApply", () => {
		const _ = itemNoArb.getArbApply satisfies undefined;
		const _1 = itemNoArb1.getArbApply satisfies undefined;
		const _2 = itemHasArbRec.getArbApply satisfies () => ArbApply<
			typeof itemHasArbRec
		>;
	});
});

describe("record with 2 fields", () => {
	test("correct type of getArbApply", () => {
		const _ = item.getArbApply satisfies () => ArbApply<typeof item>;
	});

	test("should generate record", () => {
		fc.assert(
			fc.property(genValueFromApply(item), (item) => {
				expect(typeof item).toBe("object");
				expect(typeof item.done).toBe("boolean");
				expect(typeof item.text).toBe("string");
			}),
		);
	});

	test("should generate record change", () => {
		fc.assert(
			fc.property(genValueFromApply(item), genChangeFromApply(item), (v, d) => {
				return propCanApplyApplies(item, v, d);
			}),
		);
	});
});

describe("union", () => {
	test("correct type of getArbApply", () => {
		const _ = union.getArbApply satisfies () => ArbApply<typeof union>;
	});

	test("should generate union", () => {
		fc.assert(
			fc.property(genValueFromApply(union), (u) => {
				return typeof u === "boolean" || typeof u === "string";
			}),
		);
	});

	test("should generate union change", () => {
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
	test("should generate either change", () => {
		fc.assert(
			fc.property(
				genValueFromApply(either),
				genChangeFromApply(either),
				(v, d) => {
					return propCanApplyApplies(either, v, d);
				},
			),
		);
	});
});

describe("optional", () => {
	test("should generate optional change", () => {
		fc.assert(
			fc.property(
				genValueFromApply(optional),
				genChangeFromApply(optional),
				(v, d) => {
					return propCanApplyApplies(optional, v, d);
				},
			),
		);
	});
});
