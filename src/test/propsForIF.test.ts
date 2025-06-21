import fc from "fast-check";
import { concat, map } from "../incr/array";
import { atomicFunc, constant, identity } from "../incr/builder";
import { compose, composeNoInterm } from "../incr/compose";
import { comm } from "../incr/tuple";
import type { IF } from "../incr/types";
import * as gp from "./helpers/genPatched.test";
import { propIsIdentity, propsForIF } from "./helpers/props.test";

fc.configureGlobal({ numRuns: 100 });

const arbInt = gp.integer();
const arbStr = gp.string();
const arbSingletonInt = gp.tuple(arbInt);
const arbTupleIntStr = gp.tuple(arbInt, arbStr);
const arbSingletonRecordInt = gp.record({ integer: arbInt });
const arbRecordIntStr = gp.record({
	int: gp.integer({ min: 0, max: 5 }),
	str: gp.string({ minLength: 0, maxLength: 5 }),
});
const arrayInt = gp.array(arbInt, { maxLength: 5 });
const array2DInt = gp.array(gp.array(arbInt, { maxLength: 3 }), {
	maxLength: 4,
});
const array3DInt = gp.array(
	gp.array(gp.array(arbInt, { maxLength: 3 }), { maxLength: 4 }),
	{ maxLength: 4 },
);
const arrayRecordIntStr = gp.array(arbRecordIntStr, { maxLength: 5 });
const arrayTupleIntStr = gp.array(arbTupleIntStr, { maxLength: 5 });
const arraySingletonRecordInt = gp.array(arbSingletonRecordInt, {
	maxLength: 5,
});
const array2DTupleIntStr = gp.array(arrayTupleIntStr, { maxLength: 4 });
const array2DSingletonRecordInt = gp.array(arraySingletonRecordInt, {
	maxLength: 5,
});
const array2DRecordIntStr = gp.array(arrayRecordIntStr, { maxLength: 4 });

const arbs: [string, gp.GenWithPatches<unknown>][] = [
	["int", arbInt],
	["str", arbStr],
	["singletonInt", arbSingletonInt],
	["tupleIntStr", arbTupleIntStr],
	["arbSingletonRecordInt", arbSingletonRecordInt],
	["arbRecordIntStr", arbRecordIntStr],
	["arrayInt", arrayInt],
	["array2DInt", array2DInt],
	["array3DInt", array3DInt],
	["arrayTupleIntStr", arrayTupleIntStr],
	["arraySingletonRecordInt", arraySingletonRecordInt],
	["arrayRecordIntStr", arrayRecordIntStr],
	["array2DRecordIntStr", array2DRecordIntStr],
	["array2DTupleIntStr", arrayTupleIntStr],
	["array2DSingletonRecordInt", arraySingletonRecordInt],
];
const arbsArray: [string, gp.GenWithPatches<unknown[]>][] = [
	["arrayInt", arrayInt],
	["array2DInt", array2DInt],
	["array3DInt", array3DInt],
	["arrayTupleIntStr", arrayTupleIntStr],
	["arraySingletonRecordInt", arraySingletonRecordInt],
	["arraySingletonRecordInt", arraySingletonRecordInt],
	["arrayRecordIntStr", arrayRecordIntStr],
	["array2DRecordIntStr", array2DRecordIntStr],
	["array2DTupleIntStr", arrayTupleIntStr],
	["array2DSingletonRecordInt", arraySingletonRecordInt],
];

const arbsArrayConcat: [string, gp.GenWithPatches<unknown[][]>][] = [
	["array2DInt", array2DInt],
	["array3DInt", array3DInt],
	["array2DTupleIntStr", array2DTupleIntStr],
	["array2DSingletonRecordInt", array2DSingletonRecordInt],
	["array2DRecordIntStr", array2DRecordIntStr],
	["array2DRecordIntStr", array2DRecordIntStr],
];

const forEachArb = <T>(
	arbs: [string, gp.GenWithPatches<T>][],
	f: (arb: gp.GenWithPatches<T>) => void,
) => {
	for (const [name, arb] of arbs) {
		describe(name, () => void f(arb));
	}
};

const testPropsForIF = <T = unknown>(
	arbs: [string, gp.GenWithPatches<T>][],
	// biome-ignore lint/suspicious/noExplicitAny: Ignore return type of IF
	getIF: <T1 extends T>() => IF<T1, any>,
) => {
	forEachArb(arbs, (arb) => propsForIF(it, arb, getIF));
};

const testPropsForIFArray = <T = unknown>(
	arbs: [string, gp.GenWithPatches<T[]>][],
	// biome-ignore lint/suspicious/noExplicitAny: Ignore return type of IF
	getIF: <T1 extends T>() => IF<T1[], any>,
) => {
	forEachArb(arbs, (arb) => propsForIF(it, arb, getIF));
};

const testPropsForIFConcat = <T = unknown>(
	arbs: [string, gp.GenWithPatches<T[][]>][],
	// biome-ignore lint/suspicious/noExplicitAny: Ignore return type of IF
	getIF: <T1 extends T>() => IF<T1[][], any>,
) => {
	forEachArb(arbs, (arb) => propsForIF(it, arb, getIF));
};

describe("identity", () => {
	testPropsForIF(
		arbs,
		<T>(): IF<T, [T, T]> => compose(identity<T>(), identity()),
	);
	forEachArb(arbs, (arb) => propIsIdentity(it, () => identity<unknown>(), arb));
});

describe("constant", () => {
	forEachArb(arbs, (arb) =>
		propsForIF(it, arb, <T>(z: string) => constant<string, T>(z), fc.string()),
	);
});

describe("compose", () => {
	describe("id . id", () => {
		testPropsForIF(arbs, <T>() => compose(identity<T>(), identity()));
	});

	describe("const . id", () => {
		testPropsForIF(arbs, <T>() => compose(identity<T>(), constant("test")));
	});

	const mapping = map(
		atomicFunc(({ int, str }: gp.InferArbValue<typeof arbRecordIntStr>) =>
			Array((int + str.length) % 10)
				.fill(null)
				.map((_, i) => 1000 + i),
		),
	);
	const composed = compose(
		mapping,
		atomicFunc((xss): number => xss.reduce((s, a) => s + a.length, 0)),
	);
	describe("total length from mapped arrays", () => {
		propsForIF(it, arrayRecordIntStr, () => composed);
	});
});

describe("atomicFunc", () => {
	propsForIF(it, arbRecordIntStr, () =>
		atomicFunc(
			({ int, str }: gp.InferArbValue<typeof arbRecordIntStr>) =>
				int + str.length,
		),
	);
});

describe("composeNoInterm", () => {
	describe("comm . comm", () => {
		forEachArb([["arbTupleIntStr", arbTupleIntStr]], (arb) =>
			propsForIF(it, arb, () => composeNoInterm(comm(), comm())),
		);

		forEachArb([["arbTupleIntStr", arbTupleIntStr]], (arb) =>
			propIsIdentity(
				it,
				() => composeNoInterm(comm<number, string>(), comm()),
				arb,
			),
		);
	});
});

describe("list", () => {
	describe("map", () => {
		describe("map id", () => {
			testPropsForIFArray(arbsArray, <T>(): IF<T[], T[]> => map(identity<T>()));
			forEachArb(arbsArray, (arb) =>
				propIsIdentity(it, <T>() => map(identity<T>()), arb),
			);
		});

		describe("map const", () => {
			forEachArb(arbsArray, (arb) =>
				propsForIF(
					it,
					arb,
					(z: string) => map(constant<string, unknown>(z)),
					fc.string(),
				),
			);
		});
	});

	describe("concat", () => {
		forEachArb(arbsArrayConcat, (arb) => propsForIF(it, arb, () => concat()));

		describe("concat from number", () => {
			propsForIF(it, gp.array(gp.integer({ min: 0, max: 5 })), () =>
				compose(
					map(
						atomicFunc((n: number) =>
							Array(n % 10)
								.fill(null)
								.map((_, i) => 1000 + i),
						),
					),
					concat(),
				),
			);
		});

		describe("concat from map record", () => {
			propsForIF(it, arrayRecordIntStr, () =>
				compose(
					map(
						atomicFunc(
							({ int, str }: gp.InferArbValue<typeof arbRecordIntStr>) =>
								Array((int + str.length) % 10)
									.fill(null)
									.map((_, i) => 1000 + i),
						),
					),
					concat(),
				),
			);
		});

		describe("map identity then concat", () => {
			testPropsForIFConcat(arbsArrayConcat, <T>() =>
				compose(map(identity<T[]>()), concat()),
			);
		});
	});
});
