import {
	isLL,
	type LL,
	llFromIterable,
	llGetIndex,
	llLength,
	llSetIndex,
	llSplice,
	llToArray,
} from "./cons";

export class LinkedList<T = unknown> implements ArrayLike<T> {
	[n: number]: T;

	private _ll: LL<T> = null;

	constructor(arr?: T[] | Iterable<T> | LL<T> | null) {
		if (isLL(arr)) {
			this._ll = arr;
			return;
		}

		this._ll = llFromIterable(arr);
	}

	get length() {
		return llLength(this._ll);
	}

	getIndex(index: number): T | undefined {
		return llGetIndex(this._ll, index);
	}

	setIndex(index: number, value: T): boolean {
		const out = { value: true };
		this._ll = llSetIndex(this._ll, index, value, out);
		return out.value;
	}

	setIndexUpdate(index: number, value: T) {
		return new LinkedList(llSetIndex(this._ll, index, value));
	}

	toArray() {
		return llToArray(this._ll);
	}

	splice(start: number, deleteCount: number, ...items: T[]) {
		this._ll = llSplice(this._ll, start, deleteCount, items);
	}

	*[Symbol.iterator]() {
		let ll = this._ll;
		while (ll !== null) {
			yield ll.head;
			ll = ll.tail;
		}
	}

	readonly [Symbol.toStringTag] = "LinkedList";
}

const LinkedListHandler: ProxyHandler<LinkedList<unknown>> = {
	ownKeys(target) {
		const arr: string[] = [];
		for (let i = 0; i < target.length; i++) {
			arr.push(String(i));
		}

		return [...arr, ...Reflect.ownKeys(target)];
	},
	getOwnPropertyDescriptor(target, key) {
		if (typeof key === "symbol") {
			return Reflect.getOwnPropertyDescriptor(target, key);
		}

		const n = Number.parseInt(key, 10);
		if (Number.isInteger(n) && n >= 0 && n < target.length) {
			return {
				configurable: true,
				enumerable: true,
				value: target.getIndex(n),
				writable: true,
			};
		}

		return Reflect.getOwnPropertyDescriptor(target, key);
	},
	get(target, key, receiver) {
		if (typeof key === "symbol") {
			return Reflect.get(target, key, receiver);
		}

		const n = Number.parseInt(key, 10);
		if (Number.isInteger(n) && n >= 0 && n < target.length) {
			return target.getIndex(n);
		}

		return Reflect.get(target, key, receiver);
	},
	set(target, key, value, receiver) {
		if (typeof key === "symbol") {
			return Reflect.set(target, key, value, receiver);
		}

		const n = Number.parseInt(key, 10);
		if (Number.isInteger(n) && n >= 0 && n < target.length) {
			return target.setIndex(n, value);
		}

		return Reflect.set(target, key, value, receiver);
	},
};

export const create = <T>(xs?: T[] | Iterable<T> | null) =>
	new Proxy(new LinkedList(xs), LinkedListHandler);
