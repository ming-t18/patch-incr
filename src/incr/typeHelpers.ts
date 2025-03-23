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
