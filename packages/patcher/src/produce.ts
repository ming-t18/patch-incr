import { type Patches, PatchOp } from "patch-incr/patch";
import { createDraft, current, finishDraft, patchesOnRoot } from "./proxy";

export const NOTHING = Symbol.for("immer-nothing");

export type Recipe1<T> = (
	draft: T,
) => T | undefined | (undefined extends T ? typeof NOTHING : never);

export interface IProduceWithPatches {
	<T>(recipe: Recipe1<T>): (base: T) => [T, Patches<T>];
	<T>(recipe: Recipe1<T>, base: T): [T, Patches<T>];
}

const _produceWithPatches = <T>(func: Recipe1<T>, base: T) => {
	const draft: T = createDraft(base);
	try {
		let res = func(draft);
		if (typeof res === "undefined") {
			return [current(draft), patchesOnRoot(draft)];
		}
		if (res === NOTHING) {
			res = undefined as never;
		}
		return [res, [{ op: PatchOp.Replace, path: [], value: res }]];
	} finally {
		finishDraft(draft);
	}
};

// @ts-expect-error Casting function type
export const produceWithPatches: IProduceWithPatches = <T>(
	func: Recipe1<T>,
	...rest: unknown[]
) => {
	if (rest.length === 0) {
		return (arg: T) => _produceWithPatches(func, arg);
	}
	return _produceWithPatches(func, rest[0] as T);
};
