import type { AnyTuple } from "@/patchSchema/types";
import type { AssignSingleTuple } from "./assignSingleTuple";

export const TypesKey = "~types" as const;
export type TypesKey = "~types";

/**
 * Object containing an optional field to hold type parameters.
 */
export interface HasTypes<K extends string = string, T = unknown> {
	[TypesKey]?: Record<K, T> | undefined;
}

/**
 * Removes `null` and `undefined` from a union.
 */
export type Defined<T> = T extends undefined
	? never
	: T extends null
		? never
		: T;

/**
 * Given a key and a `HasTypes`, access its generic type by key.
 */
export type AccessTypes<K extends string, T extends HasTypes<K>> = Defined<
	T[TypesKey]
>[K];

/**
 * Given a record of values of `HasTypes`, creates a new record type
 * by performing `AccessType` on each of the values.
 */
export type AccessTypesRecord<
	K extends string,
	R extends Record<string, HasTypes<K>>,
> = { [key in keyof R]: AccessTypes<K, R[key]> };

/**
 * Given a tuple of `HasTypes` values, creates a new tuple type
 * by performing `AccessType` on each of the values.
 */
export type AccessTypesTuple<K extends string, R extends HasTypes<K>[]> = {
	[key in keyof R]: AccessTypes<K, R[key]>;
};

/** For inferring the path access of `Map` and ImmutableJS collections. */
export interface HasGetMethod<K, V> {
	get(arg: K): V;
}

/**
 * An Immer `enablePatches()`-compatible JSON path.
 *
 * TODO: create a branded type version of Path.
 */
type Path = (string | number)[];

export type AccessPathSingle<O, K extends string | number> =
	O extends HasGetMethod<K, infer V>
		? V
		: O extends Record<K, infer V>
			? V
			: K extends number
				? O extends (infer V)[]
					? V
					: never
				: never;

export type AccessPathOptSingle<O, K extends string | number> =
	Defined<O> extends HasGetMethod<K, infer V | null | undefined>
		? V
		: Defined<O> extends Partial<Record<K, infer V>>
			? V
			: K extends number
				? Defined<O> extends (infer V)[]
					? V
					: never
				: never;

export type AccessPath<O, P extends Path> = P extends []
	? O
	: P extends [infer K extends string | number, ...infer Rest extends Path]
		? AccessPath<AccessPathSingle<O, K>, Rest>
		: never;

export type AccessPathOpt<O, P extends Path> = P extends []
	? O
	: P extends [infer K extends string | number, ...infer Rest extends Path]
		? AccessPathOpt<AccessPathOptSingle<O, K>, Rest>
		: never;

export type AssignSingleNumber<O, K extends number, V1> = O extends AnyTuple
	? AssignSingleTuple<O, K, V1>
	: O extends (infer V)[]
		? (V | V1)[]
		: never;

export type AssignSingle<O, K extends string | number, V1> =
	O extends HasGetMethod<K, infer V>
		? Omit<O, "get"> & HasGetMethod<K, V | V1>
		: K extends number
			? AssignSingleNumber<O, K, V1>
			: O extends Record<K, infer _V>
				? { [key in keyof O]: key extends K ? V1 : O[key] }
				: O;

export type AssignPath<O, P extends Path, V> = P extends []
	? V
	: P extends [infer K extends string | number, ...infer Rest extends Path]
		? AssignSingle<O, K, AssignPath<AccessPathSingle<O, K>, Rest, V>>
		: never;

interface TestObj {
	a: { b: { c: string }[] };
	tup: [number, bigint];
	opt?: { b?: { c: string }[] | null };
}

// { c: string }[]
type _TestAccessObj = AccessPath<TestObj, ["a", "b"]>;
// bigint
type _TestAccessTuple = AccessPath<TestObj, ["tup", 1]>;
// { c: string }
type _TestAccessArray1 = AccessPath<TestObj, ["a", "b", number]>;
// { c: string }
type _TestAccessArraySpecific = AccessPath<TestObj, ["a", "b", 5]>;
// { c: string }
type _TestAccessMap = AccessPath<
	[Map<string, { b: { c: string } }>],
	[0, "a", "b"]
>;

// { c: string }
type _TestAccessOpt = AccessPathOpt<TestObj, ["opt", "b", number]>;

// [string, number]
type _Test1 = AccessTypesTuple<
	"change",
	[HasTypes<"change", string>, HasTypes<"change", number>]
>;

// { a: string, b: number }
type _Test2 = AccessTypesRecord<
	"change",
	{
		a: HasTypes<"change", string>;
		b: HasTypes<"change", number>;
	}
>;

// { a: string, ... }
type _TestAssign1 = AssignSingle<TestObj, "a", string>;

// [number, bigint, null, { x: 1 }, 'y']
type _TestAssign2 = AssignPath<
	[number, bigint, null, "test", "y"],
	[3],
	{ x: 1 }
>;

// { a: { b: bigint }, ... }
type _TestAssign3 = AssignPath<TestObj, ["a", "b"], bigint>;

// { a: { b: (bigint | { c: ... })[] }, ... }
type _TestAssign4 = AssignPath<TestObj, ["a", "b", number], bigint>;

// { a: { b: { c: bigint }[] }, ... }
type _TestAssign5 = AssignPath<TestObj, ["a", "b", number, "c"], bigint>;
