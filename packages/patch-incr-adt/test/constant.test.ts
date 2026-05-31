import * as s from "@/index";

const c1 = s.constant("test", null);
describe("constant", () => {
	it("empty is null", () => {
		expect(c1.empty).toBe(null);
	});
	it("apply does nothing", () => {
		expect(c1.apply("test", null)).toBe("test");
	});
});
