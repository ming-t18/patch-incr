import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { assocLeft, assocRight, comm } from "@/builder/tuple";
import * as gp from "./helpers/genPatched.test";
import { ensurePatchCoherent } from "./helpers/props.test";

const arbElem0 = gp.record({
	number: gp.atomic(fc.integer({ min: -100, max: 100 })),
	string: gp.string(),
});

const arbPair0 = gp.tuple(arbElem0, arbElem0);

describe("comm", () => {
	it("comm is patch coherent", () => {
		fc.assert(
			fc.property(arbPair0.arb(), ({ value, patches }) =>
				ensurePatchCoherent(value, patches, comm()),
			),
		);
	});

	it("inverse", () => {
		const c = comm();
		fc.assert(
			fc.property(arbPair0.arb(), ({ value }) =>
				expect(c.inverseEvaluate(c.evaluate(value))).toStrictEqual(value),
			),
		);
	});
});

describe("assocLeft", () => {
	const arbTriple0 = gp.tuple(arbElem0, arbPair0);
	it("assocLeft is patch coherent", () => {
		fc.assert(
			fc.property(arbTriple0.arb(), ({ value, patches }) =>
				ensurePatchCoherent(value, patches, assocLeft()),
			),
		);
	});

	it("inverse", () => {
		const al = assocLeft();
		fc.assert(
			fc.property(arbTriple0.arb(), ({ value }) =>
				expect(al.inverseEvaluate(al.evaluate(value))).toStrictEqual(value),
			),
		);
	});
});

describe("assocRight", () => {
	const arbTriple0 = gp.tuple(arbPair0, arbPair0);
	it("assocRight is patch coherent", () => {
		fc.assert(
			fc.property(arbTriple0.arb(), ({ value, patches }) =>
				ensurePatchCoherent(value, patches, assocRight()),
			),
		);
	});

	it("inverse", () => {
		const al = assocRight();
		fc.assert(
			fc.property(arbTriple0.arb(), ({ value }) =>
				expect(al.inverseEvaluate(al.evaluate(value))).toStrictEqual(value),
			),
		);
	});
});
