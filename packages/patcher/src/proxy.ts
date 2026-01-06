import { applyGet, type Patches, PatchOp, type Path } from "patch-incr/patch";
import {
	doPatch,
	GetTarget,
	isTrackedRef,
	toKey,
	unwrapTracked,
} from "./helpers";
import {
	checkNumArgs,
	METHOD_HANDLERS,
	NON_MUTATING_ARRAY_METHODS,
} from "./methods";
import type { Root, TrackedRef } from "./types";

export const originalRoot = <T = unknown>(value: T): T | undefined =>
	isTrackedRef(value) ? (value[GetTarget]._root._orig as T) : undefined;

export const original = <T = unknown>(value: T): T | undefined => {
	if (!isTrackedRef(value)) {
		return undefined;
	}

	const target = value[GetTarget];
	return isTrackedRef(value)
		? applyGet(target._root._orig, target._path)
		: undefined;
};

const currentFromRef = <T = unknown>(ref: TrackedRef<T>): T => {
	const { _path: path, _root: root } = ref;
	return applyGet(root._track ? (root._curr as T) : undefined, path);
};

export const current = <T = unknown>(value: T): T | undefined =>
	isTrackedRef<T>(value) ? currentFromRef<T>(value[GetTarget]) : undefined;

export const currentPath = <T = unknown>(value: T): Path | undefined =>
	isTrackedRef<T>(value) ? value[GetTarget]._path : undefined;

export const isDraft = <T = unknown>(value: T): boolean =>
	isTrackedRef<T>(value) ? !value[GetTarget]._root._finished : false;

export const patchesOnRoot = <T = unknown>(
	value: T,
): Patches<T> | undefined => {
	if (!isTrackedRef(value)) {
		return undefined;
	}

	const root = value[GetTarget]._root;
	return root._track ? (root._patches as Patches<T>) : undefined;
};

export const isTracked = <T = unknown>(value: T): boolean =>
	isTrackedRef(value) ? (value[GetTarget]._root._track ?? false) : false;

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyFunc = (...args: any[]) => any;

const makeMethodHandler = <T = unknown>(
	target: TrackedRef<T>,
	parent: T,
	_actualFunc: AnyFunc,
	methodName: string,
): AnyFunc => {
	const method = METHOD_HANDLERS[methodName];
	if (!method) {
		if (Array.isArray(parent) && !NON_MUTATING_ARRAY_METHODS.has(methodName)) {
			throw new TypeError(
				`apply: Cannot call mutating array method ${methodName}`,
			);
		}
		// @ts-expect-error Getting bound function
		const bound: AnyFunc = parent[methodName];
		return bound;
	}

	return (...args: unknown[]) => {
		const nArgs = args.length;
		if (!checkNumArgs(method?.numArgs, nArgs)) {
			throw new TypeError(
				`apply: ${methodName}: incorrect number of arguments`,
			);
		}

		const res = method.handler(target, target._path, args);
		return "value" in res ? res.value : makeRef(target._root, res.path);
	};
};

const _getRef = <T = unknown>(target: TrackedRef<T>, key: string) => {
	const path1 = [...target._path, toKey(key)];
	return makeRef(target._root, path1);
};

export const HANDLER: ProxyHandler<TrackedRef<unknown>> = {
	get(target, key, receiver) {
		if (key === GetTarget) {
			return target;
		}

		if (!target._root._track) {
			if (typeof key === "symbol") {
				throw new TypeError("get: symbols are not supported");
			}
			return _getRef(target, key);
		}

		const curr = currentFromRef(target);
		const fromGet = Reflect.get(curr as never, key, receiver);
		if (typeof key === "symbol") {
			return fromGet;
		}

		if (typeof fromGet === "function") {
			return makeMethodHandler(target, curr, fromGet, key);
		}

		if (
			fromGet === null ||
			fromGet === undefined ||
			typeof fromGet !== "object"
		) {
			return fromGet;
		}

		if (typeof key === "symbol") {
			throw new TypeError("get: symbols are not supported");
		}
		return _getRef(target, key);
	},
	set(target, key, value, _receiver) {
		if (typeof key === "symbol") {
			throw new Error("set: symbols are not supported");
		}

		if (target._root._track) {
			const prevValue = applyGet(target._root._curr, [
				...target._path,
				toKey(key),
			]);
			if (Object.is(prevValue, value)) {
				return true;
			}
		}
		doPatch(target._root, [
			{
				op: PatchOp.Replace,
				path: [...target._path, toKey(key)],
				value: unwrapTracked(value),
			},
		]);
		return true;
	},
	deleteProperty(target, key) {
		if (typeof key === "symbol") {
			throw new Error("symbols are not supported");
		}

		doPatch(target._root, [
			{ op: PatchOp.Remove, path: [...target._path, toKey(key)] },
		]);
		return true;
	},
	ownKeys(target) {
		if (!target._root._track) {
			return [];
		}

		const res = currentFromRef(target) as unknown;
		return Array.isArray(res)
			? Object.keys(res)
			: Reflect.ownKeys(res as never);
	},
	has(target, key) {
		if (key === GetTarget) {
			return true;
		}

		if (!target._root._track) {
			return true;
		}
		return Reflect.has(currentFromRef(target) as never, key);
	},
	isExtensible(_target) {
		return false;
	},
	defineProperty(_target, _key, _prop) {
		throw new TypeError("cannot defineProperty");
	},
	preventExtensions(_target) {
		return false;
	},
	getOwnPropertyDescriptor(target, key) {
		if (key === GetTarget) {
			return {
				value: target,
				configurable: false,
				enumerable: false,
				writable: false,
			};
		}
		if (!target._root._track) {
			throw new TypeError(
				"untracked: cannot call getOwnPropertyDescriptor on untracked draft",
			);
		}

		if (typeof key === "symbol") {
			throw new TypeError("symbols are not supported");
		}
		return {
			value: _getRef(target, key),
			configurable: true,
			enumerable: true,
			writable: true,
		};
	},
	getPrototypeOf(target) {
		return Reflect.getPrototypeOf(currentFromRef(target) as never);
	},
	setPrototypeOf(_target, _proto) {
		throw new TypeError("cannot setPrototypeOf");
	},
	apply(_target, _thisArg, _args) {
		throw new TypeError("cannot apply");
	},
	construct() {
		throw new TypeError("cannot construct");
	},
};

const makeRef = <T>(root: Root<T>, path: Path) =>
	new Proxy({ _root: root, _path: path }, HANDLER);

export const createDraft = <T>(target: T, track = true) => {
	const root: Root<T> = {
		_finished: false,
		_orig: target,
		_curr: target,
		_patches: [],
		_track: track,
	};
	return makeRef(root, []) as T;
};

export const finishDraft = <T>(target: T) => {
	if (!isTrackedRef(target)) {
		throw new TypeError("finishDraft: not a draft");
	}

	const root = target[GetTarget]._root;
	if (root._finished) {
		throw new TypeError("finishDraft: already finished");
	}

	root._finished = true;
	// @ts-expect-error Intentional for clearing the state
	delete root._orig;
	// @ts-expect-error Intentional for clearing the state
	delete root._patches;
	const res = root._curr as T;
	delete root._curr;
	return res;
};
