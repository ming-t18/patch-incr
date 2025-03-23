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
	liftPatch as liftPatches,
} from "../../incr/patch";

// biome-ignore lint/suspicious/noExplicitAny: used to infer
export type InferArb<T extends Arbitrary<any>> = T extends {
	// biome-ignore lint/suspicious/noExplicitAny: used to infer
	generate(...args: any[]): { value: infer V };
}
	? V
	: never;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type WithPatches<T = any> = { value: T; patches: Patches<T> };

export type InferArbValue<T extends ArbWithPatches> = InferArb<T>["value"];

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type ArbWithPatches<T = any> = Arbitrary<WithPatches<T>>;

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

const anything = (depth = 5): Arbitrary<unknown> => {
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

export const arbPathOnValue = (value: unknown): fc.Arbitrary<Path> => {
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
							weight: 4 * value.length + 2,
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

export const atomic = <T = unknown>(arbValue: fc.Arbitrary<T>) =>
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

export const valuePatches = <T = unknown>(arbValue?: fc.Arbitrary<T>) =>
	(arbValue ?? anything()).chain((value) =>
		fc.record({
			value: fc.constant(value),
			patches: arbValidPatchesOnValue(value),
		}),
	);

type ArbPatches<T> = fc.Arbitrary<Patches<T>>;

const makeArbWithPatches = <T>(
	value: fc.Arbitrary<T>,
	patches: ArbPatches<T>,
): ArbWithPatches<T> => fc.record({ value, patches });

const arbLiftPatches = <Input, T>(
	arbKey: fc.Arbitrary<string | number>,
	arbPatches: ArbPatches<Input>,
): ArbPatches<T> =>
	// @ts-expect-error can't be checked
	fc
		.tuple(arbPatches, arbKey)
		.map(([patches, key]) => {
			const lifted = liftPatches(key, patches);
			// console.log({ patches, lifted });
			return lifted;
		});

const arbRemovePatches = <T>(
	arbKey: fc.Arbitrary<string | number>,
): ArbPatches<T> =>
	arbKey.map((key) => [
		{
			op: PatchOp.Remove,
			path: [key],
		},
	]);

const arbAddReplacePatches = <Input, T>(
	arbKey: fc.Arbitrary<string | number>,
	arb: ArbWithPatches<Input>,
	ops = [PatchOp.Add, PatchOp.Replace] as (PatchOp.Add | PatchOp.Replace)[],
): ArbPatches<T> =>
	fc
		.tuple(
			fc.constantFrom(...ops),
			arb.map((x) => x.value),
			arbKey,
		)
		.map(
			([op, value, i]) =>
				[
					{
						op,
						path: [i],
						value,
					},
				] as Patches,
		);

export const array = <T>(
	arbValue: ArbWithPatches<T>,
	constraints?: fc.ArrayConstraints,
): ArbWithPatches<T[]> => {
	return fc.array(arbValue, constraints).chain((arr): ArbWithPatches<T[]> => {
		if (arr.length === 0) {
			const arbPatches: ArbPatches<T[]> = fc.oneof({
				weight: 1,
				arbitrary: arbValue.map(({ value }) => [
					{
						op: PatchOp.Add,
						path: [0],
						value,
					},
				]),
			});
			return makeArbWithPatches(fc.constant([] as T[]), arbPatches);
		}

		const arbIndex = fc.integer({ min: 0, max: arr.length - 1 });
		// @ts-expect-error can't be checked
		const arbPatches: ArbPatches<T[]> = fc.oneof(
			{
				weight: 3,
				arbitrary: arbIndex.map((i) => liftPatches(i, arr[i].patches)),
			},
			{
				weight: 1,
				arbitrary: arbRemovePatches(arbIndex),
			},
			{
				weight: 1,
				arbitrary: arbAddReplacePatches(arbIndex, arbValue),
			},
		);

		return makeArbWithPatches(fc.constant(arr.map((x) => x.value)), arbPatches);
	});
};

export type InferArbRecordType<O extends Record<string, ArbWithPatches>> = {
	[key in keyof O]: InferArbValue<O[key]>;
};

export const record = <O extends Record<string, ArbWithPatches>>(
	arb: O,
	allowDelete?: string[],
): ArbWithPatches<InferArbRecordType<O>> => {
	return fc.record(arb).chain((obj): ArbWithPatches<InferArbRecordType<O>> => {
		const arbKey = fc.constantFrom(...Object.keys(obj));
		// @ts-expect-error can't be checked
		const arbPatches: ArbPatches<InferArbRecordType<O>> = arbKey.chain(
			(key) => {
				const oneof: { weight: number; arbitrary: ArbPatches<never> }[] = [
					{
						weight: 3,
						arbitrary: fc.constant(liftPatches(key, obj[key].patches)),
					},
					{
						weight: 1,
						arbitrary: arbAddReplacePatches<never, never>(
							fc.constant(key),
							fc.constant(obj[key] as never),
						),
					},
				];

				if (allowDelete && allowDelete.indexOf(key, 0) !== -1) {
					oneof.push({
						weight: 1,
						arbitrary: arbRemovePatches(fc.constant(key)),
					});
				}

				return fc.oneof(...oneof) as ArbPatches<unknown>;
			},
		);

		const obj1 = {} as InferArbRecordType<O>;
		for (const key of Object.keys(obj)) {
			// @ts-expect-error can't be checked
			obj1[key] = obj[key].value;
		}

		return makeArbWithPatches(fc.constant(obj1), arbPatches);
	});
};
