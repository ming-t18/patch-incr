import { describe, expect, it, test } from "bun:test";
import { deepEquals } from "bun";
import fc from "fast-check";
import type { AnyHasArbApply } from "@/props";
import { makePropsApply } from "@/props/change";
import {
	genChangeFromApply,
	genValueFromApply,
	genValueWith2Changes,
	genValueWithChange,
} from "@/props/gen";
import type { $A, $D, $T } from "@/types/abbr";
import { ApplyStructure } from "@/types/algebra";
export const propCanApplyApplies = <A extends $A>(
	apply: A,
	value: $T<A>,
	change: $D<A>,
): true => {
	fc.pre(apply.canApply(value, change));
	apply.apply(value, change);
	return true;
};

export const testCasesPropsApply = <A extends AnyHasArbApply>(apply: A) => {
	const arbValue = genValueFromApply(apply);
	const arbChange = genChangeFromApply(apply);
	const props = makePropsApply(apply, deepEquals, deepEquals);
	const testProp = (
		name: string,
		toAssert: () => Parameters<typeof fc.assert>[0],
	) => {
		it(name, () => {
			fc.assert(toAssert());
		});
	};
	describe("monoid", () => {
		test("isEmpty(empty)", () => {
			expect(props.emptyIsEmpty()).toBe(true);
		});
		testProp("empty <> a = a", () =>
			fc.property(arbChange, props.leftIdentity),
		);
		testProp("a <> empty = a", () =>
			fc.property(arbChange, props.rightIdentity),
		);
		testProp("assoc", () =>
			fc.property(arbChange, arbChange, arbChange, props.assoc),
		);
	});

	describe("apply", () => {
		testProp("v @ empty = v", () => fc.property(arbValue, props.emptyNoChange));

		testProp("isEmpty(d) ==> v @ d = v", () =>
			fc.property(arbValue, arbChange, props.isEmptyImpliesNoChange),
		);

		testProp("(v @ d1) @ d2 = v @ (d1 <> d2)", () =>
			fc.property(arbValue, arbChange, arbChange, props.applyCombine),
		);
	});

	describe("apply-replace", () => {
		if (apply.structure === ApplyStructure.One) {
			testProp("isEmpty(R(a)) for constant type", () =>
				fc.property(arbValue, (r) => apply.isEmpty(apply.fromReplace(r))),
			);
		} else {
			testProp("!isEmpty(R(a)) for non-constant type", () =>
				fc.property(arbValue, props.replaceIsNotEmpty),
			);
		}
		testProp("R(a) <> R(b) = R(b)", () =>
			fc.property(arbValue, arbValue, props.replaceOverridesFirstReplace),
		);
		testProp("d <> R(b) = R(b)", () =>
			fc.property(arbChange, arbValue, props.combineWithReplaceIsReplace),
		);
		testProp("a @ R(b) = b", () =>
			fc.property(arbValue, arbValue, props.applyReplaceReplaces),
		);
	});

	describe("getReplaceOnly", () => {
		testProp("getReplaceOnly(empty) = null", () =>
			fc.property(arbValue, props.isReplaceOnlyIsNullOnEmpty),
		);
		testProp("getReplaceOnly(fromReplace(a)) = a", () =>
			fc.property(arbValue, props.isReplaceOnlyOnReplace),
		);

		it("isReplace is null", () => {
			expect(props.isReplaceOnlyIsNullOnEmpty()).toBe(true);
		});
		testProp("isReplace on replace", () =>
			fc.property(arbValue, props.isReplaceOnlyOnReplace),
		);
	});

	describe("canApply", () => {
		testProp("canApply(empty) is always true", () =>
			fc.property(arbValue, props.canApplyEmptyAlwaysTrue),
		);
		testProp("canApply(R(b)) is always true", () =>
			fc.property(arbValue, arbValue, props.canApplyReplaceAlwaysTrue),
		);
		testProp("canApply <=> apply suceeds", () =>
			// must test with canApply being false
			fc.property(arbValue, arbChange, props.canApplyIffApplyNoError),
		);
	});

	describe("trim", () => {
		testProp("trim preserves the result of apply", () =>
			fc.property(genValueWithChange(apply), ({ x, dx }) =>
				props.trimPreservesApply(x, dx),
			),
		);
		testProp(
			"trim empty is preserved after composing two effective empties",
			() =>
				fc.property(genValueWith2Changes(apply), ({ dx1, dx2 }) =>
					props.trimEmptyPreservedInCompose(dx1, dx2),
				),
		);
	});
};
