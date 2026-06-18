import * as s from "@/index";

export const item = s.object({
	id: s.number(),
	done: s.boolean(),
	description: s.string(),
});

export const omitted = s.omit(item, {
	description: true,
});

export const merged = s.merge(item, {
	isChanged: s.boolean(),
});

type _Merged = s.infer<typeof merged>;

type _G = (typeof item)["~apply"];
// { id: string, done: boolean, description: string }
type Item = s.infer<typeof item>;
type _ItemChange = s.inferChange<typeof item>;

describe("TEST", () => {
	it("examples", () => {
		const item0: Item = {
			id: 0,
			done: false,
			description: "item",
		};
		const r1 = item.fromReplace(item0);
		console.log(r1);
		console.log(item.shape.description.fromReplace("abc"));
		console.log(
			item.fromMap({ description: item.shape.description.fromReplace("abc") }),
		);
		expect(
			item.apply(
				item0,
				item.fromMapReplace({
					done: true,
				}),
			),
		).toEqual({
			...item0,
			done: true,
		});
	});
});

describe("omit", () => {
	// Should type check
	const _omitted1: s.infer<typeof omitted> = {
		id: 123,
		done: false,
	};
	it("should have modified shape", () => {
		expect(Object.keys(omitted.shape)).toEqual(["id", "done"]);
		const shape1 = { ...item.shape };
		// @ts-expect-error Deleting non-optional key
		delete shape1.description;
		expect(omitted.shape).toEqual(shape1);
	});
});

describe("omit", () => {
	// Should type check
	const _omitted1: s.infer<typeof omitted> = {
		id: 123,
		done: false,
	};
	it("should have modified shape", () => {
		expect(Object.keys(omitted.shape)).toEqual(["id", "done"]);
		const shape1 = { ...item.shape };
		// @ts-expect-error Deleting non-optional key
		delete shape1.description;
		expect(omitted.shape).toEqual(shape1);
	});
});

describe("merge", () => {
	// Should type check
	const _merged1: s.infer<typeof merged> = {
		id: 123,
		done: false,
		description: "test",
		isChanged: false,
	};
	it("should have modified shape", () => {
		expect(Object.keys(merged.shape)).toEqual([
			"id",
			"done",
			"description",
			"isChanged",
		]);
	});
});
