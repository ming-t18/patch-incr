import { IndexEnd } from "@/patchSchema/types";
import { ApplyPatchesError } from "./error";
import { NoValue, type Path } from "./types";

export interface ImmList<T = unknown> {
	readonly size: number;
	get(index: number): T | undefined;
	set(index: number, value: T): ImmList<T>;
	delete(index: number): ImmList<T>;
	insert(index: number, value: T): ImmList<T>;
}

export interface ImmMap<K = unknown, V = unknown> {
	readonly size: number;
	get(key: K): V | undefined;
	has(key: K): boolean;
	set(key: K, value: V): ImmMap<K, V>;
	delete(key: K): ImmMap<K, V>;
	update(key: K, update: (value: V | undefined) => V | undefined): ImmMap<K, V>;
	entries(): IterableIterator<[K, V]>;
}

export interface ImmSet<T = unknown> {
	readonly size: number;
	has(value: T): boolean;
	add(value: T): ImmSet<T>;
	delete(key: T): ImmSet<T>;
}

export interface Class {
	new (...args: never[]): unknown;
}

let enabled = false;

export const listClasses = new WeakSet<object>();
export const mapClasses = new WeakSet<object>();
export const setClasses = new WeakSet<object>();

export function isImmList<T = unknown>(value: unknown): value is ImmList<T> {
	return (
		value !== null &&
		typeof value === "object" &&
		listClasses.has(value.constructor)
	);
}

export function isImmMap<K = unknown, V = unknown>(
	value: unknown,
): value is ImmMap<K, V> {
	return (
		value !== null &&
		typeof value === "object" &&
		mapClasses.has(value.constructor)
	);
}

export function isImmSet<T = unknown>(value: unknown): value is ImmSet<T> {
	return (
		value !== null &&
		typeof value === "object" &&
		setClasses.has(value.constructor)
	);
}

export function isImmCollection(
	value: unknown,
): value is ImmSet | ImmMap | ImmList {
	return (
		value !== null &&
		typeof value === "object" &&
		(listClasses.has(value.constructor) ||
			mapClasses.has(value.constructor) ||
			setClasses.has(value.constructor))
	);
}

export const patchableEntries = <T>(value: T): [Path[number], unknown][] => {
	if (isImmList(value)) {
		const n = value.size;
		const xs: [number, unknown][] = [];
		for (let i = 0; i < n; i++) {
			xs.push([i, value.get(i)]);
		}
		return xs;
	} else if (isImmMap(value)) {
		return [...value.entries()] as [never, unknown][];
	} else if (isImmSet(value)) {
		return [];
	}
	throw new Error();
};

export const getOpt = <T, Result = unknown>(
	value: T,
	key: string | number,
): Result | undefined => {
	if (isImmList(value)) {
		if (typeof key !== "number") {
			return undefined;
		}
		const i = key as number;
		if (i < 0 || i >= value.size) {
			return undefined;
		}
		return value.get(i) as Result;
	} else if (isImmMap(value)) {
		return value.get(key) as Result | undefined;
	} else if (isImmSet(value)) {
		throw new TypeError("cannot get from set");
	}
	throw new Error();
};

export const get = <T, Result = unknown>(
	value: T,
	key: string | number,
): Result => {
	if (isImmList(value)) {
		return value.get(key as number) as Result;
	} else if (isImmMap(value)) {
		return value.get(key) as Result;
	} else if (isImmSet(value)) {
		throw new TypeError("cannot get from set");
	}
	throw new Error();
};

export const handleReplace = <T, Value = unknown>(
	base: T,
	key: string | number,
	value: Value,
): T => {
	if (isImmList(base)) {
		if (!(typeof key === "number")) {
			throw new ApplyPatchesError(
				"ImmList: replace: index must be a number or IndexEnd",
			);
		}
		return base.set(key, value) as T;
	} else if (isImmMap(base)) {
		return base.set(key, value) as T;
	} else if (isImmSet(base)) {
		// key ignored
		return base.add(value) as T;
	}
	throw new Error();
};

export const handleAdd = <T, Value = unknown>(
	base: T,
	key: string | number,
	value: Value,
): T => {
	if (isImmList(base)) {
		if (key === IndexEnd) {
			return base.insert(base.size, value) as T;
		} else if (!(typeof key === "number")) {
			throw new ApplyPatchesError(
				"ImmList: add: index must be a number or IndexEnd",
			);
		}
		return base.insert(key, value) as T;
	} else if (isImmMap(base)) {
		return base.set(key, value) as T;
	} else if (isImmSet(base)) {
		// key ignored
		return base.add(value) as T;
	}
	throw new Error();
};

export const handleRemove = <T, Deleted = unknown>(
	base: T,
	key: string | number,
	setValue: Deleted | typeof NoValue,
): [T, Deleted] => {
	if (isImmList<Deleted>(base)) {
		if (setValue === NoValue) {
			throw new ApplyPatchesError("ImmList: remove: value must be absent");
		}
		let index = -1;
		if (key === IndexEnd) {
			index = base.size - 1;
		} else if (!(typeof key === "number")) {
			throw new ApplyPatchesError(
				"ImmList: remove: index must be a number or IndexEnd",
			);
		} else {
			index = key as number;
		}
		const deleted: Deleted = base.get(index) as Deleted;
		return [base.delete(index) as T, deleted];
	} else if (isImmMap<string | number, Deleted>(base)) {
		if (setValue === NoValue) {
			throw new ApplyPatchesError("ImmMap: remove: value must be absent");
		}
		const got = base.get(key) as Deleted;
		return [base.delete(key) as T, got];
	} else if (isImmSet(base)) {
		// key ignored
		if (setValue === NoValue) {
			throw new ApplyPatchesError("ImmSet: remove: value must be present");
		}
		if (!base.has(setValue)) {
			return [base, undefined as Deleted];
		}
		return [base.delete(setValue) as T, setValue];
	}

	throw new Error();
};

export const enableImmutableJs = () => {
	enabled = true;
};

export const isImmutableJsEnabled = () => enabled;
