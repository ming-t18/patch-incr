import type { PathTracker, TrackedParams } from "./types";

export const GetTracked = Symbol.for("patch-tracker-GetTracked");

export function isPathTracker<T = unknown>(
	x: unknown,
): x is { [GetTracked]: PathTracker<T> } {
	return (
		x !== null &&
		(typeof x === "object" || typeof x === "function") &&
		// @ts-expect-error Accessing GetTracked
		!!x[GetTracked]
	);
}

export const getTrackedPath = <T>(x: T): unknown[] | null =>
	// @ts-expect-error Can't be checked
	x[GetTracked]?._path ?? null;

const toPrimitiveNotAllowed = () => {
	throw new TypeError(
		"PathTracker: cannot call [Symbol.toPrimitive] on a PathTracker",
	);
};

const makeHandler = (
	params?: TrackedParams,
): ProxyHandler<PathTracker<unknown>> => ({
	get(target, key, _receiver) {
		if (key === GetTracked) {
			return target;
		}

		if (key === Symbol.toPrimitive) {
			return toPrimitiveNotAllowed;
		}

		if (typeof key === "symbol") {
			if (!params?.onGetSymbol) {
				throw new TypeError(
					`PathTracker: cannot get symbol key: ${key.description}`,
				);
			}

			const res = params.onGetSymbol(target, key);
			if (res.type === "callable") {
				const invoke = res.invoke;
				return (...args: unknown[]) => {
					const path1 = [...target._path, invoke(...args)];
					return trackedProxy(path1, params);
				};
			} else {
				const path1 = [...target._path, res.result];
				return trackedProxy(path1, params);
			}
		}

		const intKey = typeof key === "string" ? Number.parseInt(key, 10) : -1;
		const path1 = [
			...target._path,
			Number.isInteger(intKey) && intKey >= 0 ? intKey : key,
		];
		return trackedProxy(path1, params);
	},
	set(_target, _key, _value, _receiver) {
		throw new TypeError("cannot set");
	},
	deleteProperty(_target, _key) {
		throw new TypeError("cannot deleteProperty");
	},
	ownKeys(_target) {
		return [];
	},
	has(_target, _key) {
		return true;
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
		if (key === GetTracked) {
			return {
				value: target,
				configurable: false,
				enumerable: false,
				writable: false,
			};
		}
		throw new TypeError("cannot getOwnPropertyDescriptor");
	},
	getPrototypeOf(_target) {
		return Reflect.getPrototypeOf(_target);
	},
	setPrototypeOf(_target, _proto) {
		throw new TypeError("cannot setPrototypeOf");
	},
	apply(target, _this, args) {
		const path = target._path;
		if (path.length === 0) {
			throw new Error("cannot apply on root");
		}
		const path1 = target._path.slice(0, target._path.length - 1);
		const name = path[path.length - 1];

		if (typeof name !== "string") {
			throw new TypeError("cannot apply: method name is not a string");
		}

		if (params?.onApply) {
			const path1 = target._path.slice(0, target._path.length - 1);
			const res = params.onApply(target, path1, name, args);
			if (!res) {
				return;
			}

			if (res.type === "value") {
				return res.result;
			}

			if (res.type === "path") {
				return trackedProxy(res.result, params);
			}
		} else {
			if (name === "get" && args.length === 1) {
				return trackedProxy([...path1, args[0]], params);
			}
		}

		throw new TypeError("cannot apply");
	},
	construct() {
		throw new TypeError("cannot construct");
	},
});

export const trackedProxy = <T>(
	path = [] as unknown[],
	params?: TrackedParams,
): T => {
	const _trackedProxyCallable = () => {};
	_trackedProxyCallable._path = path;
	return new Proxy(_trackedProxyCallable, makeHandler(params)) as never;
};
