import fc from "fast-check";
import { applyPatches, canApplyPatches } from "..//patch";
import type { GenWithPatches } from "./helpers/genPatched.test";
import * as gp from "./helpers/genPatched.test";

fc.configureGlobal({ numRuns: 1000 });

const prop_shouldPatchProperly = <T>(
	gen: GenWithPatches<T>,
	noReplaceRoot = false,
) =>
	fc.property(gen.arb(), ({ value, patches }) => {
		if (noReplaceRoot) {
			fc.pre(patches.findIndex(({ path }) => path.length > 0) !== -1);
		}
		return canApplyPatches(value, patches);
	});

describe.skip("examples", () => {
	it("examples - integer", () => {
		for (const x of fc.sample(gp.integer().arb(), 10)) {
			console.log(x);
		}
	});

	it("examples - tuple of atomics", () => {
		for (const x of fc.sample(gp.tuple().arb(), 5)) {
			console.log(x);
		}

		for (const x of fc.sample(gp.tuple(gp.integer()).arb(), 5)) {
			console.log(x);
		}

		for (const x of fc.sample(gp.tuple(gp.integer(), gp.string()).arb(), 5)) {
			console.log(x);
		}

		for (const x of fc.sample(
			gp
				.tuple(gp.tuple(gp.integer(), gp.string()), gp.tuple(gp.bigInt()))
				.arb(),
			25,
		)) {
			console.log(x);
		}
	});

	it("examples - records", () => {
		for (const x of fc.sample(
			gp
				.record({
					a: gp.record({ int: gp.integer(), str: gp.string() }),
					b: gp.record({ bigInt: gp.bigInt() }),
				})
				.arb(),
			25,
		)) {
			console.log(x);
		}
	});

	it("examples - array", () => {
		for (const x of fc.sample(
			gp.array(gp.integer(), { maxLength: 3 }).arb(),
			25,
		)) {
			console.log(x);
		}

		for (const x of fc.sample(
			gp
				.array(gp.array(gp.integer(), { maxLength: 3 }), { maxLength: 3 })
				.arb(),
			25,
		)) {
			console.log(x);
		}

		for (const x of fc.sample(
			gp
				.array(
					gp.record({
						a: gp.integer(),
						b: gp.string(),
						c: gp.array(gp.string()),
						d: gp.array(gp.record({ x: gp.string() })),
					}),
				)
				.arb(),
			25,
		)) {
			console.log(x);
		}
	});
});

describe("atomic", () => {
	it("integer should patch properly", () => {
		fc.assert(prop_shouldPatchProperly(gp.integer()));
	});
});

describe("tuple", () => {
	it("unit tuple should patch properly", () => {
		fc.assert(prop_shouldPatchProperly(gp.tuple()));
	});

	it("singleton tuple of atomics should patch properly", () => {
		fc.assert(prop_shouldPatchProperly(gp.tuple(gp.integer())));
	});

	it("tuple of atomics should patch properly", () => {
		fc.assert(prop_shouldPatchProperly(gp.tuple(gp.integer(), gp.string())));
	});

	it("nested tuples should patch properly", () => {
		fc.assert(
			prop_shouldPatchProperly(
				gp.tuple(gp.tuple(gp.integer(), gp.string()), gp.tuple(gp.bigInt())),
			),
		);
	});
});

describe("record", () => {
	it("empty record tuple should patch properly", () => {
		fc.assert(prop_shouldPatchProperly(gp.record({})));
	});

	it("singleton record of atomics should patch properly", () => {
		fc.assert(prop_shouldPatchProperly(gp.record({ integer: gp.integer() })));
	});

	it("record with 2 atomics should patch properly", () => {
		fc.assert(
			prop_shouldPatchProperly(gp.record({ a: gp.integer(), b: gp.string() })),
		);
	});

	it("nested records should patch properly", () => {
		fc.assert(
			prop_shouldPatchProperly(
				gp.record({
					a: gp.record({ int: gp.integer(), str: gp.string() }),
					b: gp.record({ bigInt: gp.bigInt() }),
				}),
			),
		);
	});
});

describe("array", () => {
	it("array of integers should patch properly", () => {
		fc.assert(prop_shouldPatchProperly(gp.array(gp.integer())));
	});

	it("2D array of integers should patch properly", () => {
		fc.assert(prop_shouldPatchProperly(gp.array(gp.array(gp.integer()))));
	});

	it("array of records should patch properly", () => {
		fc.assert(
			prop_shouldPatchProperly(
				gp.array(
					gp.record({
						a: gp.integer(),
						b: gp.string(),
					}),
				),
			),
		);
	});

	it("nested array of records should patch properly", () => {
		fc.assert(
			prop_shouldPatchProperly(
				gp.array(
					gp.record({
						a: gp.integer(),
						b: gp.string(),
						c: gp.array(gp.string(), { maxLength: 3 }),
						d: gp.array(gp.record({ x: gp.string() }), { maxLength: 3 }),
					}),
					{ maxLength: 3 },
				),
			),
		);
	});

	it("nested array of tuples should patch properly", () => {
		fc.assert(
			prop_shouldPatchProperly(
				gp.array(
					gp.tuple(
						gp.integer(),
						gp.string(),
						gp.array(gp.string(), { maxLength: 3 }),
						gp.array(gp.tuple(gp.string(), gp.integer()), { maxLength: 3 }),
						gp.array(gp.record({ p: gp.string(), q: gp.tuple(gp.integer()) }), {
							maxLength: 3,
						}),
					),
					{ maxLength: 3 },
				),
			),
			{ numRuns: 50 },
		);
	});

	it("no negative indexes", () => {
		fc.assert(
			fc.property(gp.array(gp.integer()).arb(), ({ patches }) => {
				return patches.every(({ path }) =>
					path.length > 0 && typeof path[0] === "number"
						? (path[0] as number) >= 0
						: true,
				);
			}),
		);
	});

	it("patching array of integers should not result in empty slots", () => {
		fc.assert(
			fc.property(gp.array(gp.integer()).arb(), ({ value, patches }) => {
				const value1 = applyPatches(value, patches);
				return value1.every((v) => v !== undefined);
			}),
		);
	});

	it("patching array of integers should make sure all events are integers", () => {
		fc.assert(
			fc.property(gp.array(gp.integer()).arb(), ({ value, patches }) => {
				const value1 = applyPatches(value, patches);
				return value1.every(
					(v) => typeof v === "number" && Number.isInteger(v),
				);
			}),
		);
	});
});
