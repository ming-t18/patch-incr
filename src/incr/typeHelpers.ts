export const TypesKey = "~types" as const;
export type TypesKey = "~types";

/**
 * In TypeScript generic interfaces, we often want helpers to
 * retrieve the generic parameters.
 *
 * The `~types` key is used to hold the generic parameters
 * assigned at object creation. It's optional so it has
 * absolutely no runtime representation.
 *
 * It also simplifies the access of the generic parameters,
 * avoiding complicated `infer` expressions.
 *
 * The [Standard Schema](https://standardschema.dev) uses a
 * similar technique to house type parameters in the
 * `['types']` property.
 *
 * Example:
 * ```typescript
 * interface Schema<Input, T> {
 *     validate(value: T): boolean;
 *     convert(input: Input): T;
 *     ['~types']?: { input: Input, type: T }
 * }
 *
 * // string
 * type SchmeaInput = AccessTypes<'input', Schema<string, number>>
 * ```
 */
export interface HasTypes<K extends string = string, T = unknown> {
	[TypesKey]?: Record<K, T> | undefined;
}

/**
 * Removes `undefined` from a union.
 */
export type Defined<T> = T extends undefined ? never : T;

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

type Path = (string | number)[];
export type AccessPathSingle<O, K extends string | number> = O extends {
	[k in K]: infer V;
}
	? V
	: K extends number
		? O extends (infer V)[]
			? V
			: never
		: never;

export type AccessPath<O, P extends Path> = P extends []
	? O
	: P extends [infer K extends string | number, ...infer Rest extends Path]
		? AccessPath<AccessPathSingle<O, K>, Rest>
		: never;

type TestObj = { a: { b: { c: string }[] }; tup: [number, bigint] };
// { c: string }[]
type TestAccessObj = AccessPath<TestObj, ["a", "b"]>;
// bigint
type TestAccessTuple = AccessPath<TestObj, ["tup", 1]>;
// { c: string }
type TestAccessArray1 = AccessPath<TestObj, ["a", "b", number]>;
// { c: string }
type TestAccessArraySpecific = AccessPath<TestObj, ["a", "b", 5]>;

// [string, number]
type _Test1 = AccessTypesTuple<
	"change",
	[HasTypes<"change", string>, HasTypes<"change", number>]
>;

// { a: string, b: number}
type _Test2 = AccessTypesRecord<
	"change",
	{
		a: HasTypes<"change", string>;
		b: HasTypes<"change", number>;
	}
>;
