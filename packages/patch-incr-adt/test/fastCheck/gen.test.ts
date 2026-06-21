import fc from "fast-check";
import * as s from "@/index";
import { applyToGenValue, atomicWithGen } from "@/props/gen";

const item = s.record({
	done: atomicWithGen(fc.boolean()),
	text: atomicWithGen(fc.string()),
});

const union = s.union(
	{
		boolean: atomicWithGen(fc.boolean()),
		string: atomicWithGen(fc.string()),
	},
	(x) => typeof x as "string" | "boolean",
);

const listItem = s.list(item);

describe("record", () => {
	it("should generate record", () => {
		fc.assert(
			fc.property(applyToGenValue(item), (item) => {
				// console.log(item);
				expect(typeof item).toBe("object");
				expect(typeof item.done).toBe("boolean");
				expect(typeof item.text).toBe("string");
			}),
		);
	});
});
describe("union", () => {
	it("should generate union", () => {
		fc.assert(
			fc.property(applyToGenValue(union), (u) => {
				return typeof u === "boolean" || typeof u === "string";
				// expect(typeof item.done).toBe("boolean");
				// expect(typeof item.text).toBe("string");
			}),
		);
	});
	it("should generate list", () => {
		fc.assert(
			fc.property(applyToGenValue(listItem), (xs) => {
				console.log(xs);
				// expect(typeof item).toBe("object");
				// expect(typeof item.done).toBe("boolean");
				// expect(typeof item.text).toBe("string");
			}),
		);
	});
});
