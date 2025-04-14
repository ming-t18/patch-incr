export class MultiWeakMap<Keys extends WeakKey[], Value>
	implements WeakMap<Keys, Value>
{
	readonly _map: WeakMap<WeakKey, unknown>;
	private constructor() {
		this._map = new WeakMap();
	}

	#getMap(keys: WeakKey[]): [WeakMap<WeakKey, Value>, WeakKey] | undefined {
		let map: WeakMap<WeakKey, unknown> = this._map;
		let i = 0;
		for (; i < keys.length - 1; i++) {
			map = map.get(keys[i]) as never;
			if (typeof map === "undefined") {
				return undefined;
			}
		}
		return [map as WeakMap<WeakKey, never>, keys[i]];
	}

	delete(key: Keys): boolean {
		const p = this.#getMap(key);
		if (typeof p === "undefined") {
			return false;
		}
		const [map, key1] = p;
		return map.delete(key1);
	}

	get(key: Keys): Value | undefined {
		const p = this.#getMap(key);
		if (typeof p === "undefined") {
			return undefined;
		}
		const [map, key1] = p;
		return map.get(key1);
	}

	has(key: Keys): boolean {
		const p = this.#getMap(key);
		if (typeof p === "undefined") {
			return false;
		}
		const [map, key1] = p;
		return map.has(key1);
	}

	set(key: Keys, value: Value): this {
		const p = this.#getMap(key);
		if (typeof p === "undefined") {
			return this;
		}
		const [map, key1] = p;
		map.set(key1, value);
		return this;
	}

	get [Symbol.toStringTag]() {
		return "MultiWeakMap";
	}
}
