import fc, { anything } from "fast-check";
import {
	IFGraphBuilder,
	access,
	atomicFunc,
	compose,
	constant,
	identity,
	record,
} from "../incr/builder";
import {
	PatchBuilder,
	type Path,
	applyPatches,
	isAtomicValue,
	replacePatch,
} from "../incr/patch";
import type { IF } from "../incr/types";
import * as gp from "./helpers/genPatched.test";
import { ensurePatchCoherent } from "./helpers/props.test";

const arbAtomic = <
	T = unknown,
	F extends (value: unknown) => T = (value: unknown) => T,
>(
	arbReturn?: fc.Arbitrary<T>,
) => fc.func(arbReturn ?? anything()).map((f) => atomicFunc(f));

const arbKeys = fc.array(fc.string()).map((xs) => [...new Set(...xs)]);

interface ArbIF {
	func: IF<unknown, unknown>;
	paths: Path[];
}

const arbIF = (inputPaths: Path[], depth = 5): fc.Arbitrary<ArbIF> => {
	const baseCase: fc.Arbitrary<ArbIF> = fc.record({
		paths: fc.constant<Path[]>([]),
		func: arbAtomic(),
	});
	if (inputPaths.length === 0 || depth === 0) {
		return baseCase;
	}

	const recCase: fc.Arbitrary<ArbIF> = arbKeys.chain((keys) => {
		const rec: Record<string, fc.Arbitrary<ArbIF>> = {};
		for (const k of keys) {
			rec[k] = arbIF(inputPaths, depth - 1);
		}
		return fc.record(rec).map((r1) => {
			const newPaths: Path[] = [];
			const params: Record<string, IF<unknown, unknown>> = {};
			for (const k of Object.keys(r1)) {
				for (const path of r1[k].paths) {
					newPaths.push([k, ...path]);
				}
				params[k] = r1[k].func;
			}

			return { func: record(params) as IF<unknown, unknown>, paths: newPaths };
		});
	});

	let accessCase: fc.Arbitrary<ArbIF> | null = null;
	const validAccessKeys = inputPaths
		.filter((p) => p.length > 0)
		.map((p) => p[0]);
	if (validAccessKeys.length > 0) {
		accessCase = fc.constantFrom(...validAccessKeys).map((key) => ({
			paths: inputPaths.filter(
				({ length, [0]: key0 }) => length > 0 && key0 === key,
			),
			func: access(key) as IF<unknown, unknown>,
		}));
	}

	const nonComposeCase = fc.oneof(
		{ weight: 2, arbitrary: baseCase },
		{ weight: 5, arbitrary: recCase },
		...(accessCase ? [{ weight: 2, arbitrary: accessCase }] : []),
	);

	return fc.oneof(
		{ weight: 3, arbitrary: nonComposeCase },
		{
			weight: 1,
			arbitrary: nonComposeCase.chain(({ func: f1, paths: paths1 }) =>
				arbIF(paths1, depth - 1).map(
					({ func: f2, paths: paths2 }): ArbIF => ({
						func: compose(f1, f2) as IF<unknown, unknown>,
						paths: [
							...paths1.map((p) => [1, ...p]),
							...paths2.map((p) => [0, ...p]),
						],
					}),
				),
			),
		},
	);
};

const arbRecord = (
	arbIF = arbAtomic() as fc.Arbitrary<IF<unknown, unknown>>,
): fc.Arbitrary<IF<unknown, unknown>> =>
	arbKeys.chain((keys): fc.Arbitrary<IF<unknown, unknown>> => {
		const entries: Record<string, fc.Arbitrary<IF<unknown, unknown>>> = {};
		for (const key of keys) {
			// @ts-expect-error Can't be checked
			entries[key] = fc.oneof(anything(), arbIF);
		}
		// @ts-expect-error Can't be checked
		return fc.record(entries).map((d) => record(d));
	});

describe("isAtomicValue", () => {
	it("undefined or null", () => {
		expect(isAtomicValue(undefined)).toBe(true);
		expect(isAtomicValue(null)).toBe(true);
	});

	it("number, bigint, string", () => {
		fc.assert(
			fc.property(
				fc.oneof(fc.bigInt(), fc.float(), fc.integer(), fc.string()),
				isAtomicValue,
			),
		);
	});
});

describe("arbValidPatchesOnValue", () => {
	it("apply empty patch", () => {
		fc.assert(
			fc.property(anything(), (value) =>
				Object.is(value, applyPatches(value, [])),
			),
		);
	});

	it("split patch", () => {
		fc.assert(
			fc.property(
				gp
					.valuePatches()
					.filter(({ patches }) => patches.length > 1)
					.chain(({ value, patches }) =>
						fc.integer({ min: 0, max: patches.length - 1 }).map((i) => ({
							value,
							patches,
							patches1: patches.slice(0, i),
							patches2: patches.slice(i),
						})),
					),
				({ value, patches, patches1, patches2 }) => {
					expect(
						applyPatches(applyPatches(value, patches1), patches2),
					).toStrictEqual(applyPatches(value, patches));
				},
			),
		);
	});

	it("allow applyPatches without error, first patch entry only", () => {
		fc.assert(
			fc.property(gp.valuePatches(), ({ value, patches }) => {
				applyPatches(value, patches.slice(0, 1));
				return true;
			}),
		);
	});

	it.skip("sample with patches", () => {
		for (const e of fc.sample(gp.valuePatches(), 100)) {
			console.log(e);
		}
	});

	it("allow applyPatches without error", () => {
		fc.assert(
			fc.property(gp.valuePatches(), ({ value, patches }) => {
				applyPatches(value, patches);
				return true;
			}),
		);
	});
});

describe("identity", () => {
	it("invoke returns itself", () => {
		fc.assert(
			fc.property(anything(), (x) => Object.is(x, identity().invoke(x))),
		);
	});

	it("forward returns patches as-is", () => {
		fc.assert(
			fc.property(gp.valuePatches(), ({ value, patches }) => {
				const id = identity();
				const y = id.invoke(value);
				return expect(id.forward(value, patches, y)).toStrictEqual(patches);
			}),
		);
	});

	it("patch coherent", () => {
		fc.assert(
			fc.property(gp.valuePatches(), ({ value, patches }) => {
				ensurePatchCoherent(value, patches, identity());
			}),
		);
	});
});

describe("constant", () => {
	it("invoke returns constant value", () => {
		fc.assert(
			fc.property(
				anything(),
				anything(),
				(c, x) => c === constant(c).invoke(x),
			),
		);
	});

	it("forward returns empty patches", () => {
		fc.assert(
			fc.property(anything(), gp.valuePatches(), (c, { value, patches }) => {
				const f = constant(c);
				const y = f.invoke(value);
				return expect(f.forward(value, patches, y)).toStrictEqual([]);
			}),
		);
	});

	it("patch coherent", () => {
		fc.assert(
			fc.property(anything(), gp.valuePatches(), (c, { value, patches }) => {
				ensurePatchCoherent(value, patches, constant(c));
			}),
		);
	});
});

describe("atomic", () => {
	it("patch coherent", () => {
		fc.assert(
			fc.property(
				gp.valuePatches(),
				arbAtomic(),
				({ value, patches }, atomic) => {
					ensurePatchCoherent(value, patches, atomic);
				},
			),
		);
	});
});

describe("record", () => {
	it("invoke returns record", () => {
		fc.assert(
			fc.property(
				anything(),
				arbRecord(),
				(value, rec) => typeof rec.invoke(value) === "object",
			),
		);
	});

	it("patch coherent for record of atomics", () => {
		fc.assert(
			fc.property(
				gp.atomic(fc.integer({ min: -5, max: 5 })),
				arbRecord(),
				({ value, patches }, rec) => {
					ensurePatchCoherent(value, patches, rec);
				},
			),
		);
	});
});

describe("compose", () => {
	it("compose from left to right", () => {
		fc.assert(
			fc.property(
				gp.atomic(anything()),
				arbAtomic(),
				arbAtomic(),
				({ value, patches }, f1, f2) => {
					const y = f2.invoke(f1.invoke(value));
					const composed = compose(f1, f2);
					expect(y).toStrictEqual(composed.invoke(value)[0]);
				},
			),
		);
	});

	it("patch coherent", () => {
		fc.assert(
			fc.property(
				gp.valuePatches(),
				arbAtomic(),
				arbAtomic(),
				({ value, patches }, f1, f2) => {
					const composed = compose(f1, f2);
					ensurePatchCoherent(value, patches, composed);
				},
			),
		);
	});
});

describe("access", () => {
	it("patch coherent, 2 keys", () => {
		const value = {
			a: 1,
			b: 2,
		};
		ensurePatchCoherent(
			value,
			PatchBuilder.empty().replace(["a"], 100).build(),
			access("b"),
		);
		ensurePatchCoherent(
			value,
			PatchBuilder.empty().replace(["b"], 100).build(),
			access("b"),
		);
	});

	it("patch coherent replace from atomic to object, object key", () => {
		fc.assert(
			fc.property(anything(), anything(), (from, to) => {
				ensurePatchCoherent(
					{ a: from },
					PatchBuilder.empty().replace(["a"], to).build(),
					access("a"),
				);
			}),
		);
	});

	it("patch coherent replace from atomic to object, tuple", () => {
		const value = [""];
		ensurePatchCoherent(
			value as never,
			PatchBuilder.empty().replace([0], [1, 2, 3]).build(),
			access(0),
		);
	});

	it("patch coherent", () => {
		fc.assert(
			fc.property(
				gp
					.valuePatches()
					.filter(
						({ value: x }) =>
							x !== null &&
							typeof x === "object" &&
							!Array.isArray(x) &&
							Object.keys(x).length > 0,
					)
					.chain((entry) =>
						fc
							.constantFrom(
								...Object.keys(entry.value as Record<string, unknown>),
							)
							.map((key: string) => ({ ...entry, key })),
					),
				({ value, patches, key }) => {
					try {
						access(key as never).invoke(applyPatches(value, patches) as never);
					} catch (e) {
						fc.pre(false);
					}
					ensurePatchCoherent(value as never, patches, access(key as never));
				},
			),
		);
	});

	it("is effectively identity", () => {
		fc.assert(
			fc.property(fc.string(), anything(), arbAtomic(), (key, value, f) => {
				const composed = compose(record({ [key]: f }), access(key));
				expect(composed.invoke(value)[0]).toStrictEqual(f.invoke(value));
			}),
		);
	});
});

describe("arbIF", () => {
	it("should invoke", () => {
		fc.assert(
			fc.property(arbIF([]), anything(), ({ func }, v) => {
				func.invoke(v);
				return true;
			}),
		);
	});
});

describe("GraphBuilder", () => {
	type F3Args = [number, string, number[], number];
	type F3Out = { input: number; str: string; arr: number[]; mod: number };
	const f3: IF<F3Args, F3Out> = record({
		input: atomicFunc<F3Args, number>(([input, str, arr, mod]) => input),
		str: atomicFunc<F3Args, string>(([input, str, arr, mod]) => str),
		arr: atomicFunc<F3Args, number[]>(([input, str, arr, mod]) => arr),
		mod: atomicFunc<F3Args, number>(([input, str, arr, mod]) => mod),
	});

	const testCompose = IFGraphBuilder.empty<number>()
		.add(
			[] as const,
			atomicFunc(([input]: [number]): string => "a".repeat(input)),
		)
		.add(
			[] as const,
			atomicFunc(([input]: [number]) =>
				Array(input)
					.fill(null)
					.map((_, i) => i * i),
			),
		)
		.add(
			[] as const,
			atomicFunc(([input]: [number]) => input % 10),
		)
		.add(
			[0, 1, 2] as const,
			// TODO fix type error
			f3,
		)
		.build();

	it("example", () => {
		const input = 5;
		const res = testCompose.invoke(input);
		// console.log(res);
		ensurePatchCoherent(input, replacePatch(15), testCompose);
	});
});
