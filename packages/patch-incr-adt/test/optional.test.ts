import * as s from "@/index";
export const recordOpt = s.optional(
	s.record({
		a: s.boolean(),
		b: s.string(),
	}),
);

// Should type check
const _undef: s.infer<typeof recordOpt> = undefined;

const defined: s.infer<typeof recordOpt> = { a: false, b: "test" };
describe("optional", () => {
	it("should replace defined to undefined", () => {
		expect(recordOpt.apply(defined, recordOpt.toUndefined)).toBeUndefined();
	});
	it("should combine replaces", () => {
		expect(
			recordOpt.combine(recordOpt.fromReplace(defined), recordOpt.toUndefined),
		).toEqual(recordOpt.toUndefined);
	});
	it("should combine inner changes", () => {
		const d1 = recordOpt.inner.fromMap({
			a: recordOpt.inner.shape.a.fromReplace(true),
		});
		const d2 = recordOpt.inner.fromMap({
			b: recordOpt.inner.shape.b.fromReplace("x"),
		});
		expect(recordOpt.combine(d1, d2)).toEqual(recordOpt.inner.combine(d1, d2));
	});
	it("should replace from undefined to defined", () => {
		expect(recordOpt.apply(undefined, recordOpt.fromReplace(defined))).toEqual(
			defined,
		);
	});
});
