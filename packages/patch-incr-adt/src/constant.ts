import {
	ApplyStructure,
	BaseApplyClass,
	type ReplaceOnly,
} from "@/types/algebra";

export class AConstant<T, D> extends BaseApplyClass<T, D> {
	declare readonly "~apply": {
		readonly value: T;
		readonly change: D;
		readonly empty: D;
		readonly replace: never;
		readonly internal: never;
	};
	readonly $type = "constant";

	constructor(
		readonly value: T,
		empty: D,
	) {
		super(empty, ApplyStructure.One);
	}
	apply = (_v: T, _d: D): T => this.value;
	canApply = (_: T, d: D) => d === this.empty;
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

const _INSTANCE = constant(null, null);
export const nullType = () => _INSTANCE;

// biome-ignore lint/suspicious/noConfusingVoidType: intentional
const _VOID = constant(null as never as void, null as never as void);
export const voidType = () => _VOID;

const _NEVER = constant(null as never, null as never);
export const neverType = () => _NEVER;
