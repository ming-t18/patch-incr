import fc from "fast-check";
import {
	type AnyArbApply,
	genChangeFromApply,
	genValueFromApply,
} from "@/props";
import { makePropsIF, makePropsIFA, type PropsIF } from "@/props/func";
import type { $T } from "@/types/abbr";
import type { IF, IFA } from "@/types/func";

const propTestCase = <A extends AnyArbApply, B extends AnyArbApply>(
	func: IF<A, B> | IFA<A, B>,
	props: PropsIF<A, B>,
) => {
	const arbInput = genValueFromApply(func.input);
	const arbInputChange = genChangeFromApply(func.input);
	describe("patch coherence", () => {
		it("f'(empty) = empty", () => {
			fc.assert(fc.property(arbInput, props.forwardEmptyIsEmpty));
		});
		it("single patch: f'(x @ dx) = f(x) @ f'(dx)", () => {
			fc.assert(fc.property(arbInput, arbInputChange, props.forwardSingle));
		});
		it("patch compose: f(x) @ f'(dx1 <> dx2) = f(x) @ (f'(dx1) <> f'(dx2))", () => {
			fc.assert(
				fc.property(
					arbInput,
					arbInputChange,
					arbInputChange,
					props.forwardCompose,
				),
			);
		});
	});
};

export const testCasesIF = <A extends AnyArbApply, B extends AnyArbApply>(
	func: IF<A, B>,
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

export const testCasesIdentity = <A extends AnyArbApply>(func: IFA<A, A>) => {
	const arbInput = genValueFromApply(func.input);
	const arbInputChange = genChangeFromApply(func.input);
	describe("is effectively identity function", () => {
		it("evaluate equals: id(x) = x", () => {
			fc.assert(
				fc.property(arbInput, (x) => {
					expect(func.evaluate(x)).toEqual(x);
				}),
			);
		});

		it("returns input change as-is: id'(dx) = dx", () => {
			fc.assert(
				fc.property(arbInput, arbInputChange, (x, dx) => {
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
