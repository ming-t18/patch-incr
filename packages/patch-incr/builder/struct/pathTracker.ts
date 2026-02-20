export const GetTracked = Symbol.for("patch-tracker-GetTracked");

export interface PathTracker<T = unknown> {
	_path: unknown[];
	_target?: T;
}

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

export type OnGetSymbol = (
	target: unknown,
	key: symbol,
) =>
	| { type: "value"; result: unknown }
	| { type: "callable"; invoke: (...args: unknown[]) => unknown };

const makeHandler = (
	onGetSymbol?: OnGetSymbol,
): ProxyHandler<PathTracker<unknown>> => ({
	get(target, key, _receiver) {
		if (key === GetTracked) {
			return target;
		}

		if (typeof key === "symbol") {
			if (!onGetSymbol) {
				throw new TypeError("cannot get symbol key");
			}

			const res = onGetSymbol(target, key);
			if (res.type === "callable") {
				const invoke = res.invoke;
				return (...args: unknown[]) => {
					const path1 = [...target._path, invoke(...args)];
					return trackedProxy(path1, onGetSymbol);
				};
			} else {
				const path1 = [...target._path, res.result];
				return trackedProxy(path1, onGetSymbol);
			}
		}

		const intKey = typeof key === "string" ? Number.parseInt(key, 10) : -1;
		const path1 = [
			...target._path,
			Number.isInteger(intKey) && intKey >= 0 ? intKey : key,
		];
		return trackedProxy(path1, onGetSymbol);
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
		if (
			target._path.length > 0 &&
			target._path[target._path.length - 1] === "get" &&
			args.length === 1
		) {
			const path1 = target._path.slice(0, target._path.length - 1);
			return trackedProxy([...path1, args[0]], onGetSymbol);
		}

		throw new TypeError("cannot apply except get(name)");
	},
	construct() {
		throw new TypeError("cannot construct");
	},
});

export const trackedProxy = <T>(
	path = [] as unknown[],
	onGetSymbol?: OnGetSymbol,
): T => {
	const _trackedProxyCallable = () => {};
	_trackedProxyCallable._path = path;
	return new Proxy(_trackedProxyCallable, makeHandler(onGetSymbol)) as never;
};
