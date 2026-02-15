import fc from "fast-check";
import { isReplaceOnly } from "../algebra/replaceOnly";
import { filter } from "../builder/array";
import { bind } from "../builder/bind";
import { compose, composeWithInv } from "../builder/compose";
import { access } from "../builder/struct";
import { assocRight } from "../builder/tuple";
import * as ps from "../patchSchema";
import * as gp from "./helpers/genPatched.test";
import { propsForIF } from "./helpers/props.test";

const arbArray = gp.array(gp.integer({ min: -5, max: 5 }));

const arbRecord = gp.record({
	min: gp.integer({ min: -5, max: 5 }),
	array: arbArray,
});
const patchSchema = ps.record({
	min: ps.atomic<number>(),
	array: ps.array(ps.atomic<number>()),
});
const outSchema = ps.tuple(
	ps.atomic<number[]>(),
	ps.atomic<[number[], number[]]>(),
);
type Record = gp.InferArbValue<typeof arbRecord>;

describe("bind", () => {
	describe("bind on filtering function", () => {
		const getBind = () => {
			return bind(access<number, "min", Record>("min"), (min) =>
				composeWithInv(
					compose(
						access<number[], "array", Record>("array"),
						filter((x) => x >= min),
					),
					assocRight(),
				),
			);
		};

		propsForIF(it, arbRecord, getBind);

		it("forward should not return a replace-patch if the binding part did not change", () => {
			const f = getBind();
			fc.assert(
				fc.property(arbRecord.arb(), ({ value, patches }) => {
					const res = patchSchema.analyze(patches);
					fc.pre(res !== null && !isReplaceOnly(res) && !res.min?.inner);
					const y = f.evaluate(value);
					const dy = f.forward(value, patches, y);
					return !isReplaceOnly(outSchema.analyze(dy));
				}),
			);
		});
	});
});
