import fc from "fast-check";
import type { InferApplyType } from "../../algebra";
import { getReplaceOnly } from "../../algebra/replaceOnly";
import { type Patches, PatchOp } from "../../patch";
import * as ps from "../../patchSchema";
import * as gp from "./../helpers/genPatched.test";

describe("patchSchema", () => {
	const recordSchema = ps.record({
		name: ps.atomic<string>(),
		age: ps.atomic<number>(),
		list: ps.array(ps.atomic<bigint>()),
		tup: ps.tuple(ps.atomic<bigint>(), ps.atomic<string>()),
		aot: ps.array(
			ps.tuple(
				ps.atomic<number>(),
				ps.atomic<string>(),
				ps.record({
					test: ps.atomic<null>(),
					flag: ps.atomic<boolean>(),
				}),
			),
		),
	});

	const arbValueWithPatch = gp.record({
		name: gp.atomic<string>(fc.string()),
		age: gp.atomic<number>(fc.integer()),
		list: gp.array(gp.atomic<bigint>(fc.bigInt())),
		tup: gp.tuple(
			gp.atomic<bigint>(fc.bigInt()),
			gp.atomic<string>(fc.string()),
		),
		aot: gp.array(
			gp.tuple(
				gp.atomic<number>(fc.integer()),
				gp.atomic<string>(fc.string()),
				gp.record({
					test: gp.atomic<null>(fc.constant(null)),
					flag: gp.atomic<boolean>(fc.boolean()),
				}),
			),
		),
	});

	type FromSchema = InferApplyType<typeof recordSchema>;
	type FromArb = gp.InferArbValue<typeof arbValueWithPatch>;
	const value1: FromSchema = {
		name: "",
		age: 5,
		list: [1n, 2n],
		tup: [3n, ""],
		aot: [
			[
				-2,
				"test",
				{
					test: null,
					flag: false,
				},
			],
			[
				-5,
				"test",
				{
					test: null,
					flag: true,
				},
			],
		],
	};
	// Should type check
	const _value2: FromArb = value1;

	describe("isEmpty", () => {
		it("should be true for empty patches", () => {
			expect(recordSchema.isEmpty([])).toBe(true);
		});
	});

	describe("isReplace", () => {
		it("should return null for empty patches", () => {
			expect(recordSchema.isReplace([])).toBe(null);
		});

		it("should return the replacement itself for replace", () => {
			fc.assert(
				fc.property(arbValueWithPatch.arb(), ({ value }) => {
					const res = recordSchema.isReplace(recordSchema.fromReplace(value));
					if (res === null) {
						expect(res).not.toBe(null);
						return false;
					}
					expect(getReplaceOnly(res)).toBe(value);
				}),
			);
		});

		it("should analyze patches that are effectively replace-root", () => {
			fc.assert(
				fc.property(arbValueWithPatch.arb(), ({ value, patches }) => {
					fc.pre(patches.findIndex((p) => p.path.length === 0) !== -1);
					return (
						recordSchema.isReplace(recordSchema.fromReplace(value)) !== null
					);
				}),
			);
		});
	});

	describe("liftIndex and liftKey", () => {
		it("should construct patches from deep path access", () => {
			const patch: Patches<FromSchema> = recordSchema.liftKey(
				"tup" as const,
				recordSchema.$.tup.liftIndex(
					1,
					recordSchema.$.tup.$[1].fromReplace("name1"),
				),
			);

			expect(patch).toStrictEqual([
				{
					op: PatchOp.Replace,
					path: ["tup", 1],
					value: "name1",
				},
			]);

			const patch1: Patches<FromSchema> = recordSchema.liftKey(
				"aot" as const,
				recordSchema.$.aot.liftIndex(
					5,
					recordSchema.$.aot.$elem.liftIndex(
						2 as const,
						recordSchema.$.aot.$elem.$[2].liftKey(
							"flag",
							recordSchema.$.aot.$elem.$[2].$.flag.fromReplace(false),
						),
					),
				),
			);

			expect(patch1).toStrictEqual([
				{
					op: PatchOp.Replace,
					path: ["aot", 5, 2, "flag"],
					value: false,
				},
			]);
		});
	});
});
