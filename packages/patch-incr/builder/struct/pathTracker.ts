const GetTracked = Symbol.for("patch-tracker-GetTracked");

export interface PathTracker<T> {
	_path: unknown[];
	_target?: T;
}

export function isPathTracker<T = unknown>(x: unknown): x is { [GetTracked]: PathTracker<T> } {
	// @ts-expect-error Accessing GetTracked
	return x !== null && typeof x === 'object' && !!x[GetTracked];
}

export const getTrackedPath = <T>(x: T): unknown[] | null =>
	// @ts-expect-error Can't be checked
	x[GetTracked]?._path ?? null;

const HANDLER: ProxyHandler<PathTracker<unknown>> = {
	get(target, key, _receiver) {
		if (key === GetTracked) {
			return target;
		}

		const path1 = [...target._path, key];
		return trackedProxy(path1);
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
		throw new TypeError("cannot getPrototypeOf");
	},
	setPrototypeOf(_target, _proto) {
		throw new TypeError("cannot setPrototypeOf");
	},
	apply(target, _this, args) {
		if (
			target._path.length > 0 &&
			target._path[target._path.length - 1] === "get" &&
			args.length === 1
		) {
			const path1 = target._path.slice(0, target._path.length - 1);
			return trackedProxy([...path1, args[0]]);
		}

		throw new TypeError("cannot apply except get(name)");
	},
	construct() {
		throw new TypeError("cannot construct");
	},
};

export const trackedProxy = <T>(path = [] as unknown[]): T => {
	const f = () => {};
	f._path = path;
	return new Proxy(f, HANDLER) as never;
};
