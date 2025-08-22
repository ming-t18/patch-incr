import type { AccessTypes, TypesKey } from "../builder/typeHelpers";
import type { AnyApply } from "../types";

export const ReplaceOnly = Symbol.for("ReplaceOnly");

export type ReplaceOnly<T> = { [ReplaceOnly]: T };

export type DRO<T> = ReplaceOnly<T> | null;

export interface Apply<Value, Change> {
	apply: (value: Value, change: Change) => Value;
	readonly empty: Change;
	fromReplace: (value: Value) => Change;
	isEmpty: (change: Change) => boolean;
	isReplace: (change: Change) => ReplaceOnly<Value> | null;
	[TypesKey]?: { value: Value; change: Change };
}

export type InferApplyType<T extends AnyApply> = AccessTypes<"value", T>;

export type InferChangeType<T extends AnyApply> = AccessTypes<"change", T>;

export interface ChangeBuilder<Change> {
	append: (change: Change) => void;
	build: () => Change;
}

export interface ApplyCombine<Value, Change> extends Apply<Value, Change> {
	combine: (left: Change, right: Change) => Change;
	builder?: () => ChangeBuilder<Change>;
}
