import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
	type AnyArbApply,
	genChangeFromApply,
	genValueFromApply,
	genValueWith2Changes,
	genValueWithChange,
} from "@/props";
import { makePropsIF, makePropsIFA, type PropsIF } from "@/props/func";
import type { $T } from "@/types/abbr";
import type { IF1, IFA } from "@/types/func";

const propTestCase = <A extends AnyArbApply, B extends AnyArbApply>(
	func: IF1<A, B> | IFA<A, B>,
	props: PropsIF<A, B>,
) => {
	const arbInput = genValueFromApply(func.input);
	describe("patch coherence", () => {
		it("f'(empty) = empty", () => {
			fc.assert(fc.property(arbInput, props.forwardEmptyIsEmpty));
		});
		it("single patch: canApply is preserved: canApply(f(x), f'(dx))", () => {
			fc.assert(
				fc.property(genValueWithChange(func.input), ({ x, dx }) => {
					const y = func.evaluate(x);
					const dy = func.forward(x, dx, y);
					expect(func.output.canApply(y, dy)).toBe(true);
				}),
			);
		});
		it("single patch: f'(x @ dx) = f(x) @ f'(dx)", () => {
			fc.assert(
				fc.property(genValueWithChange(func.input), ({ x, dx }) => {
					try {
						expect(props.forwardSingle(x, dx)).toBe(true);
					} catch (e) {
						const y = func.evaluate(x);
						const dyActual = func.forward(x, dx, y);
						const yActual = func.output.apply(y, dyActual);
						const yReapply = func.evaluate(func.input.apply(x, dx));
						console.error("Patch Coherence Failed", {
							x,
							dx,
							y: func.evaluate(x),
							dyActual,
							yActual,
							yReapply,
						});
						throw e;
					}
				}),
			);
		});
		it("patch compose: f(x) @ f'(dx1 <> dx2) = f(x) @ (f'(dx1) <> f'(dx2))", () => {
			fc.assert(
				fc.property(genValueWith2Changes(func.input), ({ x, dx1, dx2 }) =>
					props.forwardCompose(x, dx1, dx2),
				),
			);
		});
	});
};

export const testCasesIF = <A extends AnyArbApply, B extends AnyArbApply>(
	func: IF1<A, B>,
) => {
	const props = makePropsIF<A, B>(func);
	propTestCase(func, props);
};

export const testCasesIFA = <A extends AnyArbApply, B extends AnyArbApply>(
	func: IFA<A, B>,
) => {
	const props = makePropsIFA<A, B>(func);
	propTestCase(func, props);
};

export const testCasesIdentity = <A extends AnyArbApply>(
	func: IFA<A, A>,
	strict = false,
) => {
	describe("is effectively identity function", () => {
		it("evaluate equals: id(x) = x", () => {
			fc.assert(
				fc.property(genValueFromApply(func.input), (x) => {
					expect(func.evaluate(x)).toEqual(x);
				}),
			);
		});

		it("returns input change as-is for replace changes: id'(dx) = dx", () => {
			fc.assert(
				fc.property(
					genValueFromApply(func.input),
					genValueFromApply(func.input),
					(x, x1) => {
						expect(func.forward(x, func.input.fromReplace(x1))).toEqual(
							func.input.fromReplace(x1),
						);
					},
				),
			);
		});

		if (!strict) return;
		it("returns input change as-is for non-empty changes: id'(dx) = dx", () => {
			fc.assert(
				fc.property(genValueWithChange(func.input), ({ x, dx }) => {
					fc.pre(!func.input.isEmpty(dx));
					expect(func.forward(x, dx)).toEqual(dx);
				}),
			);
		});
	});
};

export const testCasesConstant = <A extends AnyArbApply, C extends AnyArbApply>(
	constValue: $T<C>,
	func: IFA<A, C>,
) => {
	const arbInput = genValueFromApply(func.input);
	const arbInputChange = genChangeFromApply(func.input);
	describe("is constant function", () => {
		it("evaluates to constant: const(c)(x) = c", () => {
			fc.assert(
				fc.property(arbInput, (x) => {
					expect(func.evaluate(x)).toEqual(constValue);
				}),
			);
		});

		it("forward returns empty change: const(c)'(dx) = empty", () => {
			fc.assert(
				fc.property(arbInput, arbInputChange, (x, dx) => {
					return func.output.isEmpty(func.forward(x, dx));
				}),
			);
		});
	});
};
