import { propsForIF } from "@test/props.test";
import fc from "fast-check";
import { atomicFunc } from "@/builder";
import { composeMemo } from "@/builder/compose";
import { withDebugPrint } from "@/builder/debug";
import * as Pair from "@/builder/pair";
import { accessPathFor, all, composeFlatMap } from "@/iso/pathList";
import {
	doAssign,
	mapByPathValues,
	pathListIso,
	plus,
	setAll,
} from "@/iso/pathList/builder";
import type { ByPath, PathListOptics } from "@/iso/pathList/types";
import {
	applyPatches,
	liftPatches,
	PatchBuilder,
	type Patches,
	replacePatches,
} from "@/patch";
import * as gp from "../helpers/genPatched.test";

// fc.configureGlobal({ numRuns: 10000 });

const arbXY = gp.record({
	x: gp.integer({ min: -10, max: 10 }),
	y: gp.integer({ min: -10, max: 10 }),
});
type XY = gp.InferArbValue<typeof arbXY>;

const arbRecord = gp.record({
	a: arbXY,
	b: arbXY,
	c: gp.array(arbXY, { maxLength: 10 }),
});
type Record = gp.InferArbValue<typeof arbRecord>;

const ap = accessPathFor<Record>();
const getX = accessPathFor<XY>()<number>(["x"]);
const _getY = accessPathFor<XY>()<number>(["y"]);
const getAX = ap<number>(["a", "x"]);
const getBX = ap<number>(["b", "x"]);
const getListX: PathListOptics<Record, number> = composeFlatMap(
	ap<Record["c"]>(["c"]),
	composeFlatMap(all(), getX),
);
const lens = plus(getAX, getBX, getListX);
const doubleAllX = setAll(
	lens,
	atomicFunc((x) => x * 2),
);

describe("doAssign", () => {
	it("should reassign the input unchanged", () => {
		fc.assert(
			fc.property(arbRecord.arb(), ({ value }) => {
				const entries = lens.evaluate(value);
				const reassigned = doAssign().evaluate([entries, value]);
				expect(reassigned).toStrictEqual(value);
			}),
		);
	});

	it("should reassign a single entry", () => {
		fc.assert(
			fc.property(
				arbRecord.arb(),
				fc.integer({ min: 0, max: 10 }),
				fc.integer({ min: -10, max: 10 }),
				({ value }, index, newX) => {
					const entries = lens.evaluate(value);
					fc.pre(index > 0 && index < entries.length);
					const entries1 = [...entries];
					const [path] = entries1[index];
					entries1[index] = [path, newX];
					const reassigned = doAssign().evaluate([entries1, value]);
					const expected = applyPatches(value, replacePatches(newX, path));
					expect(reassigned).toStrictEqual(expected);
				},
			),
		);
	});

	describe("lens for getting all X", () => {
		const iso = pathListIso(lens);
		it.skip("forwarding parent changes", () => {
			const x: Record = {
				a: { x: -1, y: -2 },
				b: { x: 0, y: 0 },
				c: [],
			};
			const dx = replacePatches({ x: 3, y: 4 }, ["a"]) as Patches<Record>;
			const y = iso.fw.evaluate(x);
			const dy = iso.fw.forward(x, dx, y);
			expect(dy).toStrictEqual(
				PatchBuilder.empty().replace([0, 0, 1], 3).build(),
			);
			const x1 = iso.bw.evaluate(y);
			expect(x1).toStrictEqual(x);
			const dx1 = iso.bw.forward(y, dy, x1);
			expect(dx1).toStrictEqual(replacePatches(3, ["a", "x"]));
		});
		describe("lens props for IF", () => {
			propsForIF(it, arbRecord, () => lens);
		});
		describe("lens props for assign", () => {
			const composed = composeMemo(iso.fw, iso.bw);
			it("is isomorphism", () => {
				fc.assert(
					fc.property(arbRecord.arb(), ({ value }) =>
						expect(composed.evaluate(value)).toStrictEqual(value),
					),
				);
			});
			propsForIF(it, arbRecord, () => composed);
		});

		describe("lens props for doubling x", () => {
			const composed = composeMemo(
				iso.fw,
				Pair.first(mapByPathValues(atomicFunc((x) => x * 2))),
				iso.bw,
			);
			it("doubles all x values", () => {
				fc.assert(
					fc.property(arbRecord.arb(), ({ value }) => {
						expect(composed.evaluate(value)).toStrictEqual({
							a: { x: value.a.x * 2, y: value.a.y },
							b: { x: value.b.x * 2, y: value.b.y },
							c: value.c.map(({ x, y }) => ({ x: x * 2, y })),
						} satisfies Record);
					}),
				);
			});
			it("composed path coherent example", () => {
				const value: Record = {
					a: { x: 1, y: -5 },
					b: { x: 1, y: -3 },
					c: [
						{ x: -1, y: 1 },
						{ x: 1, y: 0 },
					],
				};
				// replace into self causing problem: residual changes
				// must be filtered out
				const dValue = PatchBuilder.empty<Record>()
					.replace(["a"], { x: 1, y: 0 })
					.build();
				const y = composed.evaluate(value);
				const dy = composed.forward(value, dValue, y);
				expect(applyPatches(y, dy)).toStrictEqual({
					...y,
					a: { x: 2, y: 0 },
				});
			});
			propsForIF(it, arbRecord, () => composed);
		});
	});

	describe("incremental over pair type", () => {
		const value: XY = { x: 1, y: 2 };
		const updateX = replacePatches(10, ["x"]) as Patches<XY>;
		const updateY = replacePatches(20, ["y"]) as Patches<XY>;
		const pathList = getX.evaluate(value);
		const updateXFromPathList = replacePatches(10, [0, 0, 1]) as Patches<
			[ByPath<number>, XY]
		>;
		const assignX = doAssign<XY, number>();
		it("should update focused", () => {
			const args = [pathList, value] as [ByPath<number>, XY];
			const assigned = assignX.evaluate(args);
			expect(assigned).toStrictEqual(value);
			const dx1 = assignX.forward(args, updateXFromPathList, assigned);
			expect(dx1).toStrictEqual(updateX);
		});
		it("should be incremental over non-focused types", () => {
			const args = [pathList, value] as [ByPath<number>, XY];
			const assigned = assignX.evaluate(args);
			expect(assigned).toStrictEqual(value);
			const dx1 = assignX.forward(
				args,
				[
					...updateXFromPathList,
					...(liftPatches(1, updateY) as Patches<[ByPath<number>, XY]>),
				],
				assigned,
			);

			// residual changes before focused changes
			expect(dx1).toStrictEqual([...updateY, ...updateX]);
		});
	});
});

describe("setAll", () => {
	it("should double all", () => {
		fc.assert(
			fc.property(arbRecord.arb(), ({ value }) =>
				expect(doubleAllX.evaluate(value)).toStrictEqual({
					a: { x: 2 * value.a.x, y: value.a.y },
					b: { x: 2 * value.b.x, y: value.b.y },
					c: value.c.map(({ x, y }) => ({ x: 2 * x, y })),
				} satisfies Record),
			),
		);
	});

	propsForIF(it, arbRecord, () => doubleAllX);
});
