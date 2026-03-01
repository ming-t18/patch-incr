import { toKey } from "./helpers";

describe("toKey", () => {
	it("should convert strings containing integers to strings", () => {
		expect(toKey("0a")).toBe("0a");
		expect(toKey("a0")).toBe("a0");
		expect(toKey("test123")).toBe("test123");
		expect(toKey("123test")).toBe("123test");
	});

	it("should convert non-negative integer strings to integers", () => {
		expect(toKey("")).toBe("");
		expect(toKey("-1")).toBe("-1");
		expect(toKey("0")).toBe(0);
		expect(toKey("1")).toBe(1);
		expect(toKey("abcDef")).toBe("abcDef");
		expect(toKey("  123")).toBe(123);
		expect(toKey("123  ")).toBe(123);
		expect(toKey("  123  ")).toBe(123);
	});
});
