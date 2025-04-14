import type { Path } from "../../incr/patch";
import { doAccess } from "../access";

export const Finish = Symbol("Finish");

const keysAccess = (target: unknown, path: Path) => {
	const y = doAccess(target, path);
	if (y === null || typeof y !== "object") {
		return [];
	}
	return Reflect.ownKeys(y);
};

const accessHandler: ProxyHandler<{
	root: never;
	current: never;
	path: Path;
	finish: (root: never, path: Path) => never;
}> = {
	get({ root, current, path, finish }, key) {
		if (key === Finish) {
			return finish(root, path);
		}

		if (!Object.hasOwn(current, key)) {
			return undefined;
		}

		return new Proxy(
			{
				root,
				current: doAccess(current, [key as never]),
				path: [...path, key],
				finish,
			},
			accessHandler,
		);
	},

	has({ current }, key) {
		return key === Finish || Reflect.has(current, key);
	},

	ownKeys({ current }) {
		return [...Reflect.ownKeys(current), Finish];
	},

	getOwnPropertyDescriptor(obj, key) {
		if (key === Finish) {
			return {
				writable: false,
				configurable: false,
				enumerable: false,
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				value: this.get!(obj, Finish, undefined),
			};
		}
		return {
			...Reflect.getOwnPropertyDescriptor(obj.current, key),
			writable: false,
			configurable: false,
		};
	},

	getPrototypeOf({ current }) {
		return Reflect.getPrototypeOf(current);
	},

	defineProperty() {
		return false;
	},

	deleteProperty() {
		return false;
	},

	isExtensible() {
		return false;
	},

	set() {
		return false;
	},
};

export type InferAccessProxy<T, R> = T extends { [key in infer K]: unknown }
	? { [key in K]: InferAccessProxy<T[key], R> } & { [Finish]: R }
	: { [Finish]: R };

export const makeAccessProxy = <T, R>(
	target: T,
	finish: (target: T, path: Path) => R,
): InferAccessProxy<T, R> => {
	return new Proxy(
		{
			root: target as never,
			current: target as never,
			path: [],
			finish: finish as never,
		},
		accessHandler,
	) as never;
};
