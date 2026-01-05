import { type Patches, PatchOp } from "patch-incr/patch";
import { createDraft, current, finishDraft, patchesOnRoot } from "./proxy";

export const NOTHING = Symbol.for("immer-nothing");

export type Recipe1<T, Args extends unknown[] = []> = (
	draft: T,
	...args: Args
) => T | void | undefined | (undefined extends T ? typeof NOTHING : never);

export interface IProduceWithPatches {
	<T, Args extends unknown[] = []>(recipe: Recipe1<T, Args>): (base: T, ...args: Args) => [T, Patches<T>];
	<T, Args extends unknown[] = []>(base: T, recipe: Recipe1<T, Args>): [T, Patches<T>];
}

const _produceWithPatches = <T, Args extends unknown[] = []>(func: Recipe1<T, Args>, base: T, args: Args) => {
	const draft: T = createDraft(base);
	try {
		let res = func(draft, ...args);
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
export const produceWithPatches: IProduceWithPatches = (
  arg0: unknown,
  ...rest: unknown[]
) => {
  if (rest.length === 0) {
		return (arg: unknown) => _produceWithPatches(arg0 as never, arg, []);
	}
	return _produceWithPatches(rest[0] as never, arg0 as never, rest.slice(1));
};
