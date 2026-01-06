import { type Patches, PatchOp } from "patch-incr/patch";
import {
	type AnyFunc,
	createDraft,
	current,
	finishDraft,
	patchesOnRoot,
} from "./proxy";

export const NOTHING = Symbol.for("immer-nothing");

type Void = undefined;
export type Recipe1<T, Args extends unknown[] = []> = (
	draft: T,
	...args: Args
) => T | Void | undefined | (undefined extends T ? typeof NOTHING : never);

export interface IProduceWithPatches {
	<T, Args extends unknown[] = []>(
		recipe: Recipe1<T, Args>,
	): (base: T, ...args: Args) => [T, Patches<T>];
	<T>(base: T, recipe: Recipe1<T, []>): [T, Patches<T>];
	<T, Args extends unknown[]>(
		base: T,
		recipe: Recipe1<T, Args>,
	): (...args: Args) => [T, Patches<T>];
}

const _produceWithPatches = <T, Args extends unknown[] = []>(
	func: Recipe1<T, Args>,
	base: T,
	args: Args,
) => {
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
		return (arg: unknown, ...rest1: unknown[]) =>
			_produceWithPatches(arg0 as never, arg, rest1);
	}
	const [func]: [AnyFunc] = rest as [never];
	if (func.length <= 1) {
		return _produceWithPatches(func, arg0 as never, []);
	}
	return (...rest1: unknown[]) =>
		_produceWithPatches(func, arg0 as never, rest1);
};
