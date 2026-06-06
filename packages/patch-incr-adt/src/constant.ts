import type { Apply, ReplaceOnly } from "./types/algebra";

export interface Constant$<T, D> extends Apply<T, D> {
	$type: "constant";
}

export class AConstant<T, D> implements Constant$<T, D> {
	readonly $type = "constant";

	constructor(
		readonly value: T,
		readonly empty: D,
	) {}
	apply = (_v: T, _d: D): T => this.value;
	fromReplace = (_: T): D => this.empty;
	isReplace = (_: D): ReplaceOnly<T> | null => null;
	combine = (_a: D, _b: D): D => this.empty;
	isEmpty = (_: D): boolean => true;
}

/**
 * Creates an instance of `Apply` of a value-type with only one member
 * and a change-type with only one member being empty.
 * @param T The singleton value-type
 * @param D The singleton change-type representing the empty change of `T`
 */
export const constant = <T, D = never>(value: T, change: D) =>
	new AConstant(value, change);

export const nullType = constant(null, null);
