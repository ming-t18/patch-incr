import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import * as s from "@/index";
import type { HasArbApply } from "@/props";
import {
	atomicWithGen,
	genValueWith2Changes,
	genValueWithChange,
} from "@/props/gen";
import { DEFAULT_DEPTH } from "@/props/opts";
import { testCasesPropsApply } from "../fastCheck/testPropsApply.test";

const testCasesArrayStack = <A extends HasArbApply<T, DT>, T, DT>(
	arrayStack: s.AArrayStack<A, T, DT>,
) => {
	testCasesPropsApply(arrayStack);

	test("given an ArrayStackOp, the toApply part commutes with the array manip part (pop-push)", () => {
		fc.assert(
			fc.property(genValueWithChange(arrayStack), ({ x, dx }) => {
				fc.pre(!s.isDRO(dx));
				const dxApply = {
					...arrayStack.noop(dx.expectedLength),
					toApply: dx.toApply,
				};
				const dxApply1 = {
					...dxApply,
					expectedLength: arrayStack.getNewExpectedLength(dx),
				};
				const dxManip = { ...dx, toApply: new Map() };
				expect(arrayStack.apply(arrayStack.apply(x, dxApply), dxManip)).toEqual(
					arrayStack.apply(arrayStack.apply(x, dxManip), dxApply1),
				);
			}),
		);
	});

	test("combining has net change in array length", () => {
		fc.assert(
			fc.property(genValueWith2Changes(arrayStack), ({ x, dx1, dx2 }) => {
				fc.pre(!s.isDRO(dx1) && !s.isDRO(dx2));
				const dx = arrayStack.combine(dx1, dx2);
				return (
					!s.isDRO(dx) &&
					arrayStack.apply(arrayStack.apply(x, dx1), dx2).length ===
						x.length - dx.toPop + dx.toPush.length
				);
			}),
		);
	});

	test("combining with a pop-all clears toApply", () => {
		fc.assert(
			fc.property(genValueWithChange(arrayStack), ({ dx }) => {
				fc.pre(!s.isDRO(dx));
				const dx1 = arrayStack.combine(
					dx,
					arrayStack.clear(arrayStack.getNewExpectedLength(dx)),
				);
				return !s.isDRO(dx1) && dx1.toApply.size === 0;
			}),
		);
	});

	test("combining with an internal change", () => {
		fc.assert(
			fc.property(
				genValueWithChange(arrayStack)
					.map(({ x, dx }) => ({
						x: x,
						dx: dx,
						x1: arrayStack.apply(x, dx),
					}))
					.filter(({ x1 }) => x1.length > 0)
					.chain(({ x, dx, x1 }) =>
						fc.record({
							x: fc.constant(x),
							dx: fc.constant(dx),
							x1: fc.constant(x1),
							inner: fc.integer({ min: 0, max: x1.length - 1 }).chain((i) =>
								fc.record({
									i: fc.constant(i),
									dxi: arrayStack.inner
										.getArbApply()
										.arbChange({ value: x1[i], depth: DEFAULT_DEPTH }),
								}),
							),
						}),
					),
				({ x, dx, x1, inner: { i, dxi } }) => {
					const dx1 = arrayStack.combine(
						dx,
						arrayStack.modify(x1.length, [[i, dxi]]),
					);
					expect(arrayStack.apply(x, dx1)[i]).toEqual(
						arrayStack.inner.apply(arrayStack.apply(x, dx)[i] as T, dxi),
					);
				},
			),
		);
	});

	test("unshift transform symmetry", () => {
		fc.assert(
			fc.property(
				fc.record({
					addl: arrayStack.getArbApply().arbValue(8),
					val: genValueWithChange(arrayStack),
				}),
				({ addl, val: { x, dx } }) => {
					fc.pre(!s.isDRO(dx));
					expect([...addl, ...arrayStack.apply(x, dx)] as readonly T[]).toEqual(
						arrayStack.apply(
							[...addl, ...x],
							arrayStack.unshiftTransform(addl.length, dx),
						),
					);
				},
			),
		);
	});

	test("shift transform symmetry", () => {
		fc.assert(
			fc.property(
				fc.record({
					n: fc.integer({ min: 0, max: 32 }),
					val: genValueWithChange(arrayStack),
				}),
				({ n, val: { x, dx } }) => {
					fc.pre(!s.isDRO(dx) && arrayStack.canDoShiftTransform(n, dx));
					const shifted: T[] = arrayStack.apply(x, dx).slice(n);
					const inputShifted = x.slice(n);
					expect(shifted as readonly T[]).toEqual(
						arrayStack.apply(inputShifted, arrayStack.shiftTransform(n, dx)),
					);
				},
			),
		);
	});
};

describe("array stack", () => {
	describe("of boolean", () => {
		testCasesArrayStack(s.arrayStack(atomicWithGen(fc.boolean())));
	});
	describe("of bigint", () => {
		test.skip("examples", () => {
			const gen = s.arrayStack(atomicWithGen(fc.bigInt()));
			console.log(fc.sample(genValueWithChange(gen), 100));
		});
		testCasesArrayStack(s.arrayStack(atomicWithGen(fc.bigInt())));
	});
	describe("of record", () => {
		testCasesPropsApply(
			s.arrayStack(
				s.record({
					a: atomicWithGen(fc.boolean()),
					b: atomicWithGen(fc.string()),
				}),
			),
		);
	});
	describe("of union", () => {
		testCasesPropsApply(
			s.arrayStack(
				s.union(
					{
						bool: atomicWithGen(fc.boolean()),
						str: atomicWithGen(fc.string()),
					},
					(x) => (typeof x === "boolean" ? "bool" : "str"),
				),
			),
		);
	});
	describe("two-dimensional of boolean", () => {
		testCasesArrayStack(
			s.arrayStack(s.arrayStack(atomicWithGen(fc.boolean()))),
		);
	});
	describe("two-dimensional of record", () => {
		testCasesArrayStack(
			s.arrayStack(
				s.arrayStack(
					s.record({
						a: atomicWithGen(fc.boolean()),
						b: atomicWithGen(fc.string()),
					}),
				),
			),
		);
	});
});
