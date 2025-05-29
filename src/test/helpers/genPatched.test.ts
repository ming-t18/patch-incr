import fc from "fast-check";
import {
	type PatchEntry,
	PatchOp,
	type PatchReplace,
	type Patches,
	type Path,
	type Targeted,
	applyPatches,
} from "../../incr/patch";
import { IndexEnd } from "../../patchSchema/types";
export type WithPatches<T> = { value: T; patches: Patches<T> };

export interface ArbPatchEntryOpts<T> {
	value: T;
}

export interface GenWithPatches<T> {
	arbPatchEntry(opts?: ArbPatchEntryOpts<T>): fc.Arbitrary<PatchEntry<T>>;
	isValidPatchEntry(value: T, entry: PatchEntry<T>): boolean;
	/**
	 * Given a `PatchEntry` failing `isValidPatchEntryCheck`, return
	 * a corrected `PatchEntry` that passes the check, or `null` if not possible.
	 */
	adjustPatchEntry(value: T, entry: PatchEntry<T>): PatchEntry<T> | null;
	arb(
		arbValue?: fc.Arbitrary<T>,
		ac?: fc.ArrayConstraints,
	): fc.Arbitrary<WithPatches<T>>;
	"~types"?: { value: T };
}

// biome-ignore lint/suspicious/noExplicitAny: for type constraints
export type InferArbValue<S extends { "~types"?: { value: any } }> = S extends {
	"~types"?: { value: infer T };
}
	? T
	: never;

const makeArbHelper = <T>(
	opts: Omit<GenWithPatches<T>, "arb"> & {
		arbValue: fc.Arbitrary<T>;
		arrayConstraints?: fc.ArrayConstraints;
	},
): fc.Arbitrary<WithPatches<T>> => {
	return opts.arbValue.chain((value: T) =>
		fc.record({
			value: fc.constant(value),
			patches: fc
				.array(
					opts.arbPatchEntry({ value }),
					opts.arrayConstraints ?? {
						maxLength: 6,
					},
				)
				.map((entries) => {
					let base: T = value;
					const out = [] as typeof entries;
					for (const entry of entries) {
						if (opts.isValidPatchEntry(base, entry)) {
							out.push(entry);
							try {
								base = applyPatches(base, [entry]);
							} catch (e) {
								console.error("failed to apply valid patch", e);
								console.trace({ base, entry });
								throw e;
							}
							continue;
						}

						const adjusted = opts.adjustPatchEntry(base, entry);
						if (adjusted === null) {
							return null;
						}

						out.push(adjusted);
						try {
							base = applyPatches(base, [adjusted]);
						} catch (e) {
							console.error("failed to apply adjusted patch", e);
							console.trace({ base, entry, adjusted });
							return null;
						}
					}
					return out;
				})
				.filter((x) => x !== null),
		}),
	);
};

const arbRootPath = fc.constant([] as []);

const arbReplacePatchEntry = <T, V = T, P extends Path = Path>(
	arbValue: fc.Arbitrary<V>,
	arbPath: fc.Arbitrary<P>,
): fc.Arbitrary<PatchReplace<P, V> & Targeted<T>> =>
	fc.record({
		op: fc.constant(PatchOp.Replace),
		value: arbValue,
		path: arbPath,
	});

const toArbValue = <T>(gen: GenWithPatches<T>): fc.Arbitrary<T> =>
	gen.arb().map((x) => x.value);

export const atomic = <T>(arb: fc.Arbitrary<T>): GenWithPatches<T> => {
	const isValidPatchEntry = (_value: T, { op, path }: PatchEntry<T>) =>
		op === PatchOp.Replace && path.length === 0;
	const arbPatchEntry = (
		_opts?: ArbPatchEntryOpts<T>,
	): fc.Arbitrary<PatchEntry<T>> => arbReplacePatchEntry(arb, arbRootPath);
	const adjustPatchEntry = (_value: T, _entry: PatchEntry<T>) => null;
	return {
		isValidPatchEntry,
		arbPatchEntry,
		adjustPatchEntry,
		arb: (arbValue?: fc.Arbitrary<T>, arrayConstraints?: fc.ArrayConstraints) =>
			makeArbHelper({
				isValidPatchEntry,
				arbPatchEntry,
				adjustPatchEntry,
				arrayConstraints,
				arbValue: arbValue ?? arb,
			}),
	};
};

export const integer = (c?: fc.IntegerConstraints): GenWithPatches<number> =>
	atomic(fc.integer(c));
export const bigInt = (c?: fc.BigIntConstraints): GenWithPatches<bigint> =>
	atomic(c ? fc.bigInt(c) : fc.bigInt());
export const string = (c?: fc.StringConstraints): GenWithPatches<string> =>
	atomic(fc.string(c));
export const boolean = (): GenWithPatches<boolean> => atomic(fc.boolean());

const liftEntry = <Ts extends Record<string, unknown> | unknown[]>(
	gens: { [k in keyof Ts]: GenWithPatches<Ts[k]> },
	key: keyof Ts,
	opts: { value: Ts } | undefined,
) =>
	(gens[key] as GenWithPatches<unknown>)
		.arbPatchEntry(opts ? { value: opts.value[key] } : undefined)
		.map(
			(entry: PatchEntry<unknown>) =>
				({
					...entry,
					path: [key, ...entry.path],
				}) as PatchEntry<Ts>,
		);

const deepWeightMultiplier = 4;
const arrayDeepWeightMultiplier = 1;
const arrayManipWeight = 6;

export const tuple = <Ts extends unknown[]>(
	...gens: { [i in keyof Ts]: GenWithPatches<Ts[i]> }
): GenWithPatches<Ts> => {
	const n = gens.length;
	if (n === 0) {
		return atomic(fc.tuple()) as GenWithPatches<never>;
	}

	const arbIndex = fc.integer({ min: 0, max: n - 1 });
	const arb0 = fc.tuple(...gens.map((g) => toArbValue(g))) as fc.Arbitrary<Ts>;
	const isValidPatchEntry = (value: Ts, entry: PatchEntry<Ts>) => {
		const { path } = entry;
		if (path.length === 0) {
			return true;
		}

		const index = path[0];
		if (typeof index !== "number") {
			return false;
		}

		if (path.length === 1) {
			return index >= 0 && index < n;
		}

		return gens[index].isValidPatchEntry(
			value[index] as never,
			{
				...entry,
				path: path.slice(1),
			} as PatchEntry<never>,
		);
	};

	const arbPatchEntry = (
		opts?: ArbPatchEntryOpts<Ts>,
	): fc.Arbitrary<PatchEntry<Ts>> =>
		fc.oneof(
			{
				weight: 1,
				arbitrary: arbReplacePatchEntry<Ts, Ts, []>(arb0, arbRootPath),
			},
			{
				weight: deepWeightMultiplier * n,
				arbitrary: arbIndex.chain((i) => liftEntry(gens, i, opts)),
			},
		);

	const adjustPatchEntry = (_value: Ts, entry: PatchEntry<Ts>) => {
		if (entry.path.length === 1) {
			const init = entry.path[0];
			if (typeof init === "number") {
				return { ...entry, path: [(init + n) % n, ...entry.path.slice(1)] };
			}
		}
		return null;
	};

	return {
		isValidPatchEntry,
		arbPatchEntry,
		adjustPatchEntry,
		arb: (
			arbValue?: fc.Arbitrary<Ts>,
			arrayConstraints?: fc.ArrayConstraints,
		) =>
			makeArbHelper({
				isValidPatchEntry,
				arbPatchEntry,
				adjustPatchEntry,
				arrayConstraints,
				arbValue: arbValue ?? arb0,
			}),
	};
};

export const record = <Ts extends Record<string, unknown>>(
	gens: { [k in keyof Ts]: GenWithPatches<Ts[k]> },
): GenWithPatches<Ts> => {
	const keys: (keyof Ts)[] = Object.keys(gens).filter(
		(k) => !(k === "__proto__" || k === "prototype" || k === "constructor"),
	);
	if (keys.length === 0) {
		return atomic(fc.record({})) as GenWithPatches<never>;
	}

	const arbKey = fc.constantFrom(...keys);
	const rec1: { [k in keyof Ts]: fc.Arbitrary<Ts[k]> } = {} as never;
	for (const key of keys) {
		rec1[key] = toArbValue(gens[key]);
	}
	const arb0: fc.Arbitrary<Ts> = fc.record(rec1);

	const isValidPatchEntry = (value: Ts, entry: PatchEntry<Ts>) => {
		const { path } = entry;
		if (path.length === 0) {
			return true;
		}

		if (path.length === 1) {
			return keys.find((k1) => k1 === path[0]) !== undefined;
		}

		return gens[path[0]].isValidPatchEntry(
			value[path[0]] as never,
			{
				...entry,
				path: path.slice(1),
			} as PatchEntry<never>,
		);
	};

	const arbPatchEntry = (
		opts?: ArbPatchEntryOpts<Ts>,
	): fc.Arbitrary<PatchEntry<Ts>> =>
		fc.oneof(
			{
				weight: 1,
				arbitrary: arbReplacePatchEntry<Ts, Ts, []>(arb0, arbRootPath),
			},
			{
				weight: deepWeightMultiplier * keys.length,
				arbitrary: arbKey.chain((key) => liftEntry(gens, key, opts)),
			},
		);

	const adjustPatchEntry = (_value: Ts, _entry: PatchEntry<Ts>) => null;

	return {
		isValidPatchEntry,
		arbPatchEntry,
		adjustPatchEntry,
		arb: (
			arbValue?: fc.Arbitrary<Ts>,
			arrayConstraints?: fc.ArrayConstraints,
		) =>
			makeArbHelper({
				isValidPatchEntry,
				arbPatchEntry,
				adjustPatchEntry,
				arrayConstraints,
				arbValue: arbValue ?? arb0,
			}),
	};
};

export const array = <T>(
	arbElem: GenWithPatches<T>,
	constraints?: fc.ArrayConstraints,
): GenWithPatches<T[]> => {
	const isValidPatchEntry = (value: T[], entry: PatchEntry<T[]>) => {
		const { op, path } = entry;
		if (path.length === 0) {
			return true;
		}

		const p0 = path[0];
		if (p0 === IndexEnd) {
			return op === PatchOp.Add;
		}

		const index = p0 as number;
		if (path.length > 1) {
			if (!(index >= 0 && index < value.length)) {
				return false;
			}

			return arbElem.isValidPatchEntry(value[index], {
				...entry,
				path: path.slice(1),
			} as PatchEntry<never>);
		}
		if (op === PatchOp.Remove || op === PatchOp.Replace) {
			return index >= 0 && index < value.length;
		}

		if (op === PatchOp.Add) {
			return index >= 0 && index <= value.length;
		}

		return true;
	};

	const arb0: fc.Arbitrary<T[]> = fc.array(toArbValue(arbElem), constraints);

	const arbPatchEntry = (
		opts?: ArbPatchEntryOpts<T[]>,
	): fc.Arbitrary<PatchEntry<T[]>> => {
		const arbReplaceRoot: fc.Arbitrary<PatchEntry<T[]>> = arbReplacePatchEntry<
			T[],
			T[],
			[]
		>(arb0, arbRootPath);
		if (opts?.value.length === 0) {
			return fc.oneof(
				{
					weight: 1,
					arbitrary: arbReplaceRoot,
				},
				{
					weight: arrayManipWeight,
					arbitrary: fc.record({
						op: fc.constant(PatchOp.Add),
						path: fc.constantFrom([0], [IndexEnd]),
						value: arbElem.arb().map((x): T => x.value),
					}) as fc.Arbitrary<PatchEntry<T[]>>,
				},
			);
		}

		const arbIndex =
			opts?.value?.length === 0
				? fc.constant(0)
				: fc.integer(
						opts
							? { min: 0, max: opts.value.length - 1 }
							: { min: 0, max: constraints?.maxLength },
					);
		return fc.oneof(
			{
				weight: 1,
				arbitrary: arbReplaceRoot,
			},
			{
				weight: arrayManipWeight,
				arbitrary: fc.oneof(
					fc.record({
						op: fc.constant(PatchOp.Add),
						path: fc.tuple(
							fc.oneof(
								{
									weight: 5,
									arbitrary: fc.integer(
										opts ? { min: 0, max: opts.value.length } : { min: 0 },
									),
								},
								{ weight: 1, arbitrary: fc.constant(IndexEnd) },
							),
						),
						value: arbElem.arb().map((x): T => x.value),
					}) as fc.Arbitrary<PatchEntry<T[]>>,
					fc.record({
						op: fc.constant(PatchOp.Remove),
						path: fc.tuple(arbIndex),
					}) as fc.Arbitrary<PatchEntry<T[]>>,
					fc.record({
						op: fc.constant(PatchOp.Replace),
						path: fc.tuple(arbIndex),
						value: arbElem.arb().map((x): T => x.value),
					}) as fc.Arbitrary<PatchEntry<T[]>>,
				),
			},
			{
				weight: arrayDeepWeightMultiplier * (opts?.value?.length ?? 5),
				arbitrary: arbIndex.chain((index) => {
					const ap: fc.Arbitrary<PatchEntry<T>> = arbElem.arbPatchEntry(
						opts ? { value: opts.value[index] } : undefined,
					);
					return ap.map(
						(entry) =>
							({
								...entry,
								path: [index, ...entry.path],
							}) as PatchEntry<T[]>,
					);
				}),
			},
		);
	};

	const adjustPatchEntry = (value: T[], entry: PatchEntry<T[]>) => {
		const { path, op } = entry;
		if (path.length === 1) {
			const idx = path[0];
			if (typeof idx !== "number") {
				return null;
			}

			if (idx < 0) {
				return {
					...entry,
					path: [0],
				};
			}

			if (op === PatchOp.Add && idx > value.length) {
				return {
					...entry,
					path: ["-"],
				};
			}

			if (
				(op === PatchOp.Remove || op === PatchOp.Replace) &&
				value.length > 0 &&
				idx >= value.length
			) {
				return {
					...entry,
					path: [value.length - 1],
				};
			}
		}
		if (path.length > 1) {
			const idx = path[0];
			if (typeof idx !== "number") {
				return null;
			}

			if (idx >= value.length) {
				return null;
			}
		}
		return null;
	};

	return {
		isValidPatchEntry,
		arbPatchEntry,
		adjustPatchEntry,
		arb: (
			arbValue?: fc.Arbitrary<T[]>,
			arrayConstraints?: fc.ArrayConstraints,
		) =>
			makeArbHelper({
				isValidPatchEntry,
				arbPatchEntry,
				adjustPatchEntry,
				arrayConstraints,
				arbValue: arbValue ?? arb0,
			}),
	};
};

export const arbGenPatched = () => {
	const { tree: arbGenPatched } = fc.letrec<
		Record<"tree" | "node" | "leaf", GenWithPatches<unknown>>
	>((tie) => ({
		tree: fc.oneof({ depthSize: "small" }, tie("leaf"), tie("node")),
		node: fc.oneof(
			fc.tuple(tie("tree"), tie("tree"), tie("tree")).map((xs) => tuple(...xs)),
			fc.tuple(tie("tree"), tie("tree")).map((xs) => tuple(...xs)),
			fc
				.tuple(
					tie("tree"),
					tie("tree"),
					tie("tree"),
					fc.string({ minLength: 1 }),
					fc.string({ minLength: 1 }),
					fc.string({ minLength: 1 }),
				)
				.map(([a, b, c, ka, kb, kc]) =>
					record({
						[ka]: a,
						[kb]: b,
						[kc]: c,
					}),
				),
			fc
				.tuple(
					tie("tree"),
					tie("tree"),
					fc.string({ minLength: 1 }),
					fc.string({ minLength: 1 }),
				)
				.map(([a, b, ka, kb]) =>
					record({
						[ka]: a,
						[kb]: b,
					}),
				),
		),
		leaf: fc.constantFrom(integer(), bigInt(), string(), boolean()),
	}));
	return arbGenPatched;
};

export const valuePatches = () => arbGenPatched().chain((x) => x.arb());
