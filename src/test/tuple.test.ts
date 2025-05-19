import fc from "fast-check";
import { applyPatches } from "immer";
import {
	IFGraphBuilder,
	access,
	atomicFunc,
	identity,
	record,
} from "../incr/builder";
import { concat, filter, flatMap, map, scan } from "../incr/list";
import { PatchOp, type Patches, liftPatch } from "../incr/patch";
import { assocLeft, assocRight, comm } from "../incr/tuple";
import type { IF, InferIFOutput } from "../incr/types";
import * as gp from "./helpers/genPatched.test";
import {
	ensurePatchCoherent,
	ensurePatchLiftingProperty,
} from "./helpers/props.test";

const arbElem0 = gp.record({
	number: gp.atomic(fc.integer({ min: -100, max: 100 })),
	string: gp.atomic(fc.string()),
});

const arbPair0 = gp.tuple(arbElem0, arbElem0);

describe("comm", () => {
	it("comm is patch coherent", () => {
		fc.assert(
			fc.property(arbPair0, ({ value, patches }) =>
				ensurePatchCoherent(value, patches, comm()),
			),
		);
	});

	it("inverse", () => {
		const c = comm();
		fc.assert(
			fc.property(arbPair0, ({ value }) =>
				expect(c.inverseInvoke(c.invoke(value))).toStrictEqual(value),
			),
		);
	});
});

describe("assocLeft", () => {
	const arbTriple0 = gp.tuple(arbElem0, arbPair0);
	it("assocLeft is patch coherent", () => {
		fc.assert(
			fc.property(arbTriple0, ({ value, patches }) =>
				ensurePatchCoherent(value, patches, assocLeft()),
			),
		);
	});

	it("inverse", () => {
		const al = assocLeft();
		fc.assert(
			fc.property(arbTriple0, ({ value }) =>
				expect(al.inverseInvoke(al.invoke(value))).toStrictEqual(value),
			),
		);
	});
});

describe("assocRight", () => {
	const arbTriple0 = gp.tuple(arbPair0, arbPair0);
	it("assocRight is patch coherent", () => {
		fc.assert(
			fc.property(arbTriple0, ({ value, patches }) =>
				ensurePatchCoherent(value, patches, assocRight()),
			),
		);
	});

	it("inverse", () => {
		const al = assocRight();
		fc.assert(
			fc.property(arbTriple0, ({ value }) =>
				expect(al.inverseInvoke(al.invoke(value))).toStrictEqual(value),
			),
		);
	});
});
