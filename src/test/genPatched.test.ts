import fc, { type Arbitrary } from "fast-check";
import {
	type PatchAdd,
	type PatchEntry,
	PatchOp,
	type PatchRemove,
	type PatchReplace,
	type Patches,
	type Path,
	applyPatches,
	isAtomicValue,
	liftPatch,
} from "../incr/patch";

// biome-ignore lint/suspicious/noExplicitAny: used to infer
export type InferArb<T extends Arbitrary<any>> = T extends {
	// biome-ignore lint/suspicious/noExplicitAny: used to infer
	generate(...args: any[]): { value: infer V };
}
	? V
	: never;

export type WithPatches<T = unknown> = { value: T; patches: Patches };

export type ArbWithPatches<T = unknown> = Arbitrary<WithPatches<T>>;

export const cleanUpKeys = (x: unknown): unknown => {
	if (x === null || typeof x !== "object") {
		return x;
	}

	if (Array.isArray(x)) {
		return x.map(cleanUpKeys);
	}

	const obj = {};
	for (const k of Object.keys(x)) {
		if (k === "__proto__") {
			continue;
		}

		const k1 = k.replace(/[^a-zA-Z0-9_$]/g, "");
		if (!Number.isFinite(+k1) || k1 !== "") {
			// @ts-expect-error
			obj[k1] = cleanUpKeys(x[k]);
		}
	}
	return obj;
};

export const anything = (depth = 5): Arbitrary<unknown> => {
	const baseCase = fc.anything().map(cleanUpKeys);
	if (depth <= 0) {
		return baseCase;
	}

	return fc.oneof(
		{
			weight: 1,
			arbitrary: fc.object().chain((o) => {
				const keys = Object.keys(o);
				return fc.tuple(...keys.map(() => anything(depth - 1))).map((ts) => {
					const o1: Record<string, unknown> = {};
					for (let i = 0; i < keys.length; i++) {
						o1[keys[i]] = ts[i];
					}
					return cleanUpKeys(o1);
				});
			}),
		},
		{ weight: 4, arbitrary: baseCase },
	);
};

const cannotBeInvalid = ({ op, path }: PatchEntry): boolean =>
	!(op === PatchOp.Add || (op === PatchOp.Remove && path.length === 0));

export const arbPatchEntry = (
	arbPath: Arbitrary<Path>,
	arbValue: Arbitrary<unknown>,
	value: unknown,
): Arbitrary<PatchEntry> => {
	if (isAtomicValue(value)) {
		return arbPatchOnAtomic(arbValue);
	}

	return fc
		.oneof(
			fc.record({
				op: fc.constant(PatchOp.Remove),
				path: arbPath,
			}) as fc.Arbitrary<PatchRemove>,
			fc.record({
				op: fc.constant(PatchOp.Add),
				path: arbPath,
				value: arbValue,
			}) as fc.Arbitrary<PatchAdd>,
			fc.record({
				op: fc.constant(PatchOp.Replace),
				path: arbPath,
				value: arbValue,
			}) as fc.Arbitrary<PatchReplace>,
		)
		.filter(cannotBeInvalid);
};

export const arbPatchOnAtomic = (arbValue: fc.Arbitrary<unknown>) =>
	arbValue.map((value) => ({
		op: PatchOp.Replace,
		path: [],
		value,
	})) as fc.Arbitrary<PatchReplace>;

const arbPathOnValue = (value: unknown): fc.Arbitrary<Path> => {
	const empty = fc.constant([]);
	if (value === null || typeof value !== "object") {
		return empty;
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return empty;
		}

		return fc.oneof(
			{ weight: 1, arbitrary: empty },
			{
				weight: value.length + 1,
				arbitrary: fc.integer({ min: 0, max: value.length }).chain((index) =>
					fc.oneof(
						{ weight: 1, arbitrary: fc.constant([index]) },
						{
							weight: value.length,
							arbitrary: arbPathOnValue(value[index]).map((rest) => [
								index,
								...rest,
							]),
						},
					),
				),
			},
		);
	}

	const keys = Object.keys(value);
	if (keys.length === 0) {
		return empty;
	}

	return fc.oneof(
		{ weight: 1, arbitrary: empty },
		{
			weight: keys.length + 1,
			arbitrary: fc.constantFrom(...keys).chain((key) =>
				fc.oneof(
					{ weight: 1, arbitrary: fc.constant([key]) },
					{
						weight: keys.length,
						// @ts-expect-error indexing by key
						arbitrary: arbPathOnValue(value[key]).map((rest) => [key, ...rest]),
					},
				),
			),
		},
	);
};

const arbValidPatchEntryOnValue = (value: unknown): fc.Arbitrary<PatchEntry> =>
	arbPatchEntry(arbPathOnValue(value), anything(), value).filter((entry) => {
		try {
			applyPatches(value, [entry as never]);
			return true;
		} catch (e) {
			return false;
		}
	});

const arbValidPatchesOnValueHelper = (
	value: unknown,
	maxLength: number,
): fc.Arbitrary<Patches> => {
	if (maxLength <= 0) {
		return fc.constant([]);
	}

	if (maxLength === 1) {
		return fc.tuple(arbValidPatchEntryOnValue(value));
	}

	const arbLength1 = fc.oneof(
		{ weight: 1, arbitrary: fc.integer({ min: 0, max: maxLength - 1 }) },
		{ weight: 7, arbitrary: fc.constant(maxLength - 1) },
	);

	return fc
		.tuple(arbValidPatchEntryOnValue(value), arbLength1)
		.chain(([entry, maxLength1]) => {
			const value1 = applyPatches(value, [entry]);
			return arbValidPatchesOnValueHelper(value1, maxLength1).map(
				(rest): Patches => [entry, ...rest],
			);
		});
};

export const arbValidPatchesOnValue = (
	value: unknown,
	maxLength?: number | undefined,
): fc.Arbitrary<Patches> => {
	let arb: fc.Arbitrary<Patches>;
	if (typeof maxLength !== "number") {
		arb = fc
			.integer({ min: 0, max: 32 })
			.chain((n) => arbValidPatchesOnValueHelper(value, n));
	} else {
		arb = arbValidPatchesOnValueHelper(value, maxLength);
	}
	return arb;
};

export const arbValueWithReplace = <T = unknown>(arbValue: fc.Arbitrary<T>) =>
	fc.record({
		value: arbValue,
		patches: fc.tuple(
			fc.record({
				op: fc.constant(PatchOp.Replace),
				path: fc.constant([]),
				value: arbValue,
			}),
		) as fc.Arbitrary<Patches>,
	});

export const arbValuePatches = <T = unknown>(arbValue?: fc.Arbitrary<T>) =>
	(arbValue ?? anything()).chain((value) =>
		fc.record({
			value: fc.constant(value),
			patches: arbValidPatchesOnValue(value),
		}),
	);

export const arbArray = <T>(
	arb: ArbWithPatches<T>,
	constraints?: fc.ArrayConstraints,
): ArbWithPatches<T[]> =>
	fc.array(arb).chain((arr): ArbWithPatches<T[]> => {
		const value = arr.map((a) => a.value);
		const patches = arr.flatMap(({ patches: ps }, i) => liftPatch(i, ps));
		const arbIndex = fc.integer({ min: 0, max: arr.length });
		fc.oneof(
			{
				weight: 2,
				arbitrary: fc.constant({ value, patches }),
			},
			{
				weight: 1,
				arbitrary: arbIndex.chain((i) =>
					fc.record({
						op: fc.constant(PatchOp.Add),
						path: fc.constant([i]),
						value: arb,
					}),
				),
			},
			{
				weight: 1,
				arbitrary: arbIndex.map((i) => ({
					op: PatchOp.Replace,
					path: [i],
				})),
			},
		);
		throw new Error("TODO");
	});

export const arbObjectOf = <O extends Record<string, ArbWithPatches>>(
	arb: O,
): ArbWithPatches<{ [key in keyof O]: InferArb<O[key]> }> => {
	throw new Error("TODO");
};
