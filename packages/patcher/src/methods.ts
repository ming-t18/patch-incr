import * as ap from "patch-incr/builder/array/helpers/arrayPatch";
import { applyGet, PatchOp, type Path } from "patch-incr/patch";
import { doPatch, toKey, unwrapTracked } from "./helpers";
import type { MethodHandlers, Ref } from "./types";

/* Precondition: is tracked */
const _current = <T>(target: Ref<T>, path: Path) =>
	applyGet(target._root._curr, path) as T;

export const checkNumArgs = (
	numArgs: undefined | number | { min: number; max?: number },
	actualNumArgs: number,
) => {
	if (typeof numArgs === "undefined") {
		return true;
	}
	if (typeof numArgs === "number") {
		return actualNumArgs === numArgs;
	}

	const { min, max } = numArgs;
	return (
		actualNumArgs >= min &&
		(typeof max === "number" ? actualNumArgs <= max : true)
	);
};

const convertNegativeIndex = (index: number, length: number) =>
	index < 0 ? length - index : index;

export const MAP_HANDLERS: MethodHandlers<Map<unknown, unknown>> = {
	get: {
		numArgs: 1,
		mutating: false,
		handler: (target, path, [key]) => {
			const map = _current<Map<unknown, unknown>>(target, path);
			if (map.has(key)) {
				return { path: [...path, toKey(key as never)] };
			}
			return { value: undefined };
		},
	},
	has: {
		numArgs: 1,
		mutating: false,
		handler: (target, path, [arg]) => {
			const map = _current<Map<unknown, unknown>>(target, path);
			return { value: map.has(arg) };
		},
	},
	set: {
		numArgs: 2,
		mutating: true,
		handler: (target, path, [key, value]) => {
			doPatch(target._root, [
				{
					op: PatchOp.Replace,
					path: [...path, toKey(key as never)],
					value: unwrapTracked(value),
				},
			]);
			// Returns the map itself
			return { path };
		},
	},
};

export const ARRAY_HANDLERS: MethodHandlers<unknown[]> = {
	push: {
		numArgs: undefined,
		mutating: true,
		handler: (target, path, values) => {
			doPatch(
				target._root,
				values.toReversed().map((value) => ({
					op: PatchOp.Add,
					path: [...path, "-"],
					value,
				})),
			);
			return { value: undefined };
		},
	},
	shift: {
		numArgs: 0,
		mutating: true,
		handler: (target, path, _values) => {
			const arr = _current<unknown[]>(target, path);
			if (arr.length === 0) {
				return { value: undefined };
			}
			doPatch(target._root, [
				{
					op: PatchOp.Remove,
					path: [...path, 0],
				},
			]);
			return { value: arr[0] };
		},
	},
	unshift: {
		numArgs: undefined,
		mutating: true,
		handler: (target, path, values) => {
			const arr = _current<unknown[]>(target, path);
			doPatch(
				target._root,
				values.toReversed().map((value) => ({
					op: PatchOp.Add,
					path: [...path, 0],
					value,
				})),
			);
			return { value: arr.length + values.length };
		},
	},
	pop: {
		numArgs: 0,
		mutating: true,
		handler: (target, path, _) => {
			const arr = _current<unknown[]>(target, path);
			if (arr.length === 0) {
				return { value: undefined };
			}

			const idx = arr.length - 1;
			const last = arr[idx];
			doPatch(target._root, [{ op: PatchOp.Remove, path: [...path, idx] }]);
			return { value: last };
		},
	},
	splice: {
		numArgs: { min: 0, max: undefined },
		mutating: true,
		handler: (target, path, args) => {
			const arr = _current<unknown[]>(target, path);
			const len = arr.length;
			if (args.length === 0) {
				return { value: [] };
			}

			const start = convertNegativeIndex(args[0] as number, len);
			let deleteCount = 0;
			if (args.length === 1) {
				deleteCount = len - start;
			} else {
				deleteCount = args[1] as number;
			}
			if (deleteCount < 0) {
				deleteCount = 0;
			}

			const toAdd = args.slice(2);
			doPatch(
				target._root,
				ap
					.splice(start, deleteCount, toAdd)
					.map((e) => ({ ...e, path: [...path, ...e.path] })),
			);
			const deleted = arr.slice(start, start + deleteCount);
			return { value: deleted };
		},
	},
	reverse: {
		numArgs: 0,
		mutating: true,
		handler: (target, path, _) => {
			const arr = _current<unknown[]>(target, path);
			const reversed = arr.toReversed();
			doPatch(target._root, [
				{
					op: PatchOp.Replace,
					path: path,
					value: reversed,
				},
			]);
			return { value: undefined };
		},
	},
	sort: {
		numArgs: { min: 0, max: 1 },
		mutating: true,
		handler: (target, path, args) => {
			const arr = _current<unknown[]>(target, path);
			const sorted = arr.toSorted(...(args as never[]));
			doPatch(target._root, [
				{
					op: PatchOp.Replace,
					path: path,
					value: sorted,
				},
			]);
			return { value: undefined };
		},
	},
	find: {
		mutating: false,
		numArgs: 1,
		handler: (target, path, args) => {
			const arr = _current<unknown[]>(target, path);
			const index = arr.findIndex(args[0] as never);
			if (index === -1) {
				return { value: undefined };
			}
			return { path: [...path, index] };
		},
	},
	findLast: {
		mutating: false,
		numArgs: 1,
		handler: (target, path, args) => {
			const arr = _current<unknown[]>(target, path);
			const index = arr.findLastIndex(args[0] as never);
			if (index === -1) {
				return { value: undefined };
			}
			return { path: [...path, index] };
		},
	},
};

export const NON_MUTATING_ARRAY_METHODS = new Set([
	"concat",
	"every",
	"filter",
	"find",
	"findIndex",
	"findLast",
	"findLastIndex",
	"flat",
	"includes",
	"indexOf",
	"join",
	"lastIndexOf",
	"slice",
	"some",
	"toLocaleString",
	"toString",
	"map",
	"flatMap",
	"forEach",
	"reduce",
	"reduceRight",
]);

export const METHOD_HANDLERS: MethodHandlers<unknown> = {
	...MAP_HANDLERS,
	...ARRAY_HANDLERS,
} as never;
