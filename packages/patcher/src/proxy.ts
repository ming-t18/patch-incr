import {
	applyGet,
	type Patches,
	PatchOp,
	type Path,
	shallowCopy,
} from "patch-incr/patch";
import {
	applyPatchesOnRoot,
	GetTarget,
	isRef,
	toKey,
	unwrapTracked,
} from "./helpers";
import { ARRAY_HANDLERS, checkNumArgs, MAP_HANDLERS } from "./methods";
import {
	type CreateDraftOptions,
	type MethodHandlers,
	type Ref,
	RefTag,
	type Root,
} from "./types";

export const originalRoot = <T = unknown>(value: T): T | undefined =>
	isRef(value) ? (value[GetTarget]._root._orig as T) : undefined;

/**
 * Gets the original value of a draft, or undefined if the value is not a draft.
 *
 * A draft holds the path to a value and it is possible for the value to no longer
 * exist. In that case an exception would be thrown.
 */
export const original = <T = unknown>(value: T): T | undefined => {
	if (!isRef(value)) {
		return undefined;
	}

	const target = value[GetTarget];
	return applyGet(target._root._orig, target._path);
};

const currentFromRef = <T = unknown>(ref: Ref<T>): T => {
	const { _path: path, _root: root } = ref;
	return applyGet(root._track ? (root._curr as T) : undefined, path);
};

/**
 * Gets the current value of a draft, or undefined if the value is not a draft.
 *
 * A draft holds the path to a value and it is possible for the value to no longer
 * exist. In that case an exception would be thrown.
 */
export const current = <T = unknown>(value: T): T | undefined =>
	isRef<T>(value) ? currentFromRef<T>(value[GetTarget]) : undefined;

/** Gets the path to a draft, or undefined if it not a draft. */
export const currentPath = <T = unknown>(value: T): Path | undefined =>
	isRef<T>(value) ? value[GetTarget]._path : undefined;

/** Determines if a value is a valid and not finished draft. */
export const isDraft = <T = unknown>(value: T): boolean =>
	isRef<T>(value) ? !value[GetTarget]._root._finished : false;

/** Given a draft, gets the patches applied on the *root object* of this draft. */
export const patchesOnRoot = <T = unknown>(value: T): Patches<T> | undefined =>
	isRef(value) ? (value[GetTarget]._root._patches as Patches<T>) : undefined;

export const isTracked = <T = unknown>(value: T): boolean =>
	isRef(value) ? (value[GetTarget]._root._track ?? false) : false;

// biome-ignore lint/suspicious/noExplicitAny: intentional
export type AnyFunc = (...args: any[]) => any;

function makeMethodHandler<T = unknown>(
	target: Ref<T, true>,
	parent: T,
	_actualFunc: AnyFunc,
	methodName: string,
): AnyFunc {
	let handlers: MethodHandlers<T> | undefined;
	if (parent instanceof Map) {
		handlers = MAP_HANDLERS as never;
	} else if (Array.isArray(parent)) {
		handlers = ARRAY_HANDLERS as never;
	}

	// TODO support Set handlers
	if (!handlers) {
		throw new TypeError(`apply: No supported method handlers: ${methodName}`);
	}

	const method = handlers.handlers[methodName];
	if (!method) {
		if (!handlers.original.has(methodName)) {
			throw new TypeError(`apply: Unsupported method: ${methodName}`);
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
		return "value" in res ? res.value : performGetPath(target, res.path);
	};
}

function performGet<T = unknown>(
	target: Ref<T, true>,
	key: string | symbol,
	receiver?: unknown,
) {
	if (!target._root._track) {
		if (typeof key === "symbol") {
			throw new TypeError("get: symbols are not supported");
		}
		return _getRef(target, key);
	}

	const parent = currentFromRef(target);
	const fromGet = Reflect.get(parent as never, key, receiver);
	if (typeof key === "symbol") {
		return fromGet;
	}

	if (typeof fromGet === "function" && !Object.hasOwn(parent as never, key)) {
		return makeMethodHandler(target, parent, fromGet, key);
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
}

function performGetPath<T = unknown>(target: Ref<T, true>, path: Path) {
	const res = applyGet(target._root._curr, path);
	if (res !== null && typeof res === "object") {
		return makeRef(target._root, path);
	}
	return res;
}

const _getRef = <T = unknown>(target: Ref<T, true>, key: string) => {
	const path1 = [...target._path, toKey(key)];
	return makeRef(target._root, path1);
};

export const HANDLER: ProxyHandler<Ref<unknown>> = {
	get(target, key, receiver) {
		if (key === GetTarget) {
			return target;
		}

		return performGet(target as Ref<unknown, true>, key, receiver);
	},
	set(target, key, value, _receiver) {
		if (typeof key === "symbol") {
			throw new Error("set: symbols are not supported");
		}

		// Don't generate patch for same value
		if (target._root._track) {
			const prevValue = applyGet(target._root._curr, [
				...target._path,
				toKey(key),
			]);
			if (Object.is(prevValue, value)) {
				return true;
			}
		}

		handleSet(target, key, value);
		return true;
	},
	deleteProperty(target, key) {
		if (typeof key === "symbol") {
			throw new Error("symbols are not supported");
		}

		applyPatchesOnRoot(target, [
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
			value: performGet(target, key),
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

export const createDraft = <T>(target: T, opts?: CreateDraftOptions) => {
	const track = opts?.track ?? true;
	const root: Root<T> = {
		_finished: false,
		_orig: target,
		_curr: target,
		_patches: [],
		_track: track,
		_alreadyCopied: new WeakSet(),
	};
	return makeRef(root, []) as T;
};

export const finishDraft = <T>(target: T) => {
	if (!isRef(target)) {
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

function handleSet<T = unknown>(target: Ref<T>, key: string, value: unknown) {
	const assigneeTarget = isRef(value) ? value[GetTarget] : undefined;
	const tag = assigneeTarget?._tag;
	const path = [...target._path, toKey(key)];
	if (!tag) {
		applyPatchesOnRoot(target, [
			{
				op: PatchOp.Replace,
				path,
				value: unwrapTracked(value),
			},
		]);
		return;
	}

	if (!target._root._track) {
		throw new Error("must be tracked to copy/move/swap");
	}

	if (tag === RefTag.Copy) {
		applyPatchesOnRoot(target, [
			{
				op: PatchOp.Replace,
				path,
				value: shallowCopy(unwrapTracked(value)),
			},
		]);
	} else if (tag === RefTag.Move) {
		const deleted = unwrapTracked(value);
		applyPatchesOnRoot(target, [
			{
				op: PatchOp.Remove,
				path: assigneeTarget._path,
			},
			{
				op: PatchOp.Add,
				path,
				value: deleted,
			},
		]);
	} else if (tag === RefTag.Swap) {
		const a = unwrapTracked(value);
		const b = applyGet(target._root._curr, path);
		applyPatchesOnRoot(target, [
			{
				op: PatchOp.Replace,
				path,
				value: a,
			},
			{
				op: PatchOp.Replace,
				path: assigneeTarget._path,
				value: b,
			},
		]);
	}
}
