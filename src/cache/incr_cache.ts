import type { Patches } from "../incr/patch";
import type { IF } from "../incr/types";

export type Equals<Key> = (a: Key, b: Key) => boolean;

export interface CacheWrite<Key, Value>
	extends Pick<Map<Key, Value>, "get" | "has"> {
	set(key: Key, value: Value): void;
}

export const withCache =
	<Input, Output>(
		func: (value: Input) => Output,
		cache: CacheWrite<Input, Output>,
	) =>
	(input: Input) => {
		if (cache.has(input)) {
			return cache.get(input) as Output;
		}
		const y = func(input);
		cache.set(input, y);
		return y;
	};

// TODO implement this
export const withMemoPair = <Input, Output, Interm>(
	func: IF<Input, [Output, Interm]>,
	cache: CacheWrite<Input, [Output, Interm]>,
): IF<Input, Output> => {
	const invoke1 = withCache(func.invoke, new IncrCache());
	return {
		invoke: (x: Input) => invoke1(x)[0],
		forward: (
			input: Input,
			dx: Patches<Input>,
			output: Output,
		): Patches<Output> => {
			const interm = invoke1(input)[1];
			throw new Error("TODO");
		},
	};
};

export class SingleCache<Key, Value> implements Map<Key, Value> {
	#eq: Equals<Key>;
	#set = false;
	#key: Key | undefined = undefined;
	#value: Value | undefined = undefined;

	public constructor(eq = Object.is as Equals<Key>) {
		this.#eq = eq;
	}

	get size() {
		return this.#set ? 1 : 0;
	}

	clear(): void {
		this.#key = undefined;
		this.#value = undefined;
		this.#set = false;
	}

	delete(key: Key): boolean {
		if (!this.has(key)) {
			this.#set = false;
			return false;
		}

		this.#key = undefined;
		this.#value = undefined;
		this.#set = false;
		return true;
	}

	get(key: Key): Value | undefined {
		if (this.has(key)) {
			return this.#value;
		}
		return undefined;
	}

	has(key: Key): boolean {
		if (!this.#set) {
			return false;
		}
		return this.#eq(this.#key as Key, key);
	}

	set(key: Key, value: Value): this {
		this.#set = true;
		this.#key = key;
		this.#value = value;
		return this;
	}

	forEach(
		callbackfn: (value: Value, key: Key, map: Map<Key, Value>) => void,
		thisArg?: unknown,
	): void {
		if (!this.#set) {
			return;
		}
		callbackfn.bind(thisArg)(this.#value as Value, this.#key as Key, this);
	}

	entries(): MapIterator<[Key, Value]> {
		if (!this.#set) {
			return [][Symbol.iterator]();
		}
		return [[this.#key as Key, this.#value as Value] as [Key, Value]][
			Symbol.iterator
		]();
	}

	keys(): MapIterator<Key> {
		if (!this.#set) {
			return [][Symbol.iterator]();
		}
		return [this.#key as Key][Symbol.iterator]();
	}

	values(): MapIterator<Value> {
		if (!this.#set) {
			return [][Symbol.iterator]();
		}
		return [this.#value as Value][Symbol.iterator]();
	}

	[Symbol.iterator](): MapIterator<[Key, Value]> {
		return this.entries();
	}

	get [Symbol.toStringTag]() {
		return "SingleCache";
	}
}

export const isWeakKey = (key: unknown): key is WeakKey => {
	return (key !== null && typeof key === "symbol") || typeof key === "object";
};

export class IncrCache<Key, Value> implements CacheWrite<Key, Value> {
	readonly #cache: SingleCache<Key, Value>;
	readonly #weakMap: WeakMap<WeakKey, Value>;

	public constructor() {
		this.#cache = new SingleCache();
		this.#weakMap = new WeakMap();
	}

	delete(key: Key): boolean {
		return isWeakKey(key) ? this.#weakMap.delete(key) : this.#cache.delete(key);
	}

	get(key: Key): Value | undefined {
		return isWeakKey(key) ? this.#weakMap.get(key) : this.#cache.get(key);
	}

	set(key: Key, value: Value): this {
		if (isWeakKey(key)) {
			this.#weakMap.set(key, value);
		} else {
			this.#cache.set(key, value);
		}
		return this;
	}

	has(key: Key): boolean {
		return isWeakKey(key) ? this.#weakMap.has(key) : this.#cache.has(key);
	}

	get [Symbol.toStringTag]() {
		return "IncrCache";
	}
}
