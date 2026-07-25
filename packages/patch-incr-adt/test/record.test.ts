import { describe, expect, it, test } from "bun:test";
import fc from "fast-check";
import * as s from "@/index";
import { atomicWithGen } from "@/props/gen";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";

export const singleton = s.object({
	id: atomicWithGen(fc.integer()),
});

export const nestedSingleton = s.object({
	nested: singleton,
});

export const item = s.object({
	id: atomicWithGen(fc.integer()),
	done: atomicWithGen(fc.boolean()),
	description: atomicWithGen(fc.string()),
});

export const itemNoGen = s.object({
	id: s.atomic<number>(),
	done: s.boolean(),
	description: s.string(),
});

export const omitted = s.omit(item, {
	description: true,
});

export const merged = s.merge(item, {
	isChanged: atomicWithGen(fc.boolean()),
});

type _Merged = s.infer<typeof merged>;

type _G = (typeof item)["~apply"];
// { id: string, done: boolean, description: string }
type Item = s.infer<typeof item>;
type _ItemChange = s.inferChange<typeof item>;

describe("record types", () => {
	it.skip("type checking for gen", () => {
		const _shouldPassTypeCheck = [item.arbProductRecord(0), item.getArbApply()];
		const _shouldFailTypeCheck = [
			// @ts-expect-error Should fail
			itemNoGen.arbProductRecord(),
			// @ts-expect-error Should fail
			itemNoGen.getArbApply(),
		];
	});

	describe("singleton", () => {
		testCasesPropsApply(singleton);
	});
	describe("nested singleton", () => {
		testCasesPropsApply(nestedSingleton);
	});
	describe("item", () => {
		test("key ordering of shape", () => {
			expect(Object.keys(item.shape)).toEqual(["id", "done", "description"]);
		});
		testCasesPropsApply(item);
	});
	describe("omitted", () => {
		testCasesPropsApply(omitted);
	});
	describe("merged", () => {
		test("key ordering of shape, added to the end", () => {
			expect(Object.keys(merged.shape)).toEqual([
				"id",
				"done",
				"description",
				"isChanged",
			]);
		});
		testCasesPropsApply(merged);
	});
});

describe.skip("TEST", () => {
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
