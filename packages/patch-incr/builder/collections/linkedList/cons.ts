export interface LLNode<T = unknown> {
	readonly head: T;
	readonly tail: LLNode<T> | null;
}

export type LL<T> = LLNode<T> | null;

export const cons = <T>(head: T, tail: LL<T>) => ({ head, tail });

const lenCache = new WeakMap<LLNode, number>();
export const llLength = <T = unknown>(ll: LL<T>): number => {
	if (ll === null) {
		return 0;
	}

	let res = lenCache.get(ll);
	if (typeof res === "number") {
		return res;
	}
	res = 1 + llLength(ll.tail);
	lenCache.set(ll, res);
	return res;
};

export const llGetIndex = <T>(ll: LL<T>, index: number): T | undefined => {
	if (ll === null || index < 0) {
		return undefined;
	}
	if (index === 0) {
		return ll.head;
	}
	return llGetIndex(ll.tail, index - 1);
};

export const llSetIndex = <T>(
	ll: LL<T>,
	index: number,
	value: T,
	out?: { value: boolean },
): LL<T> => {
	if (ll === null || index < 0) {
		if (out) {
			out.value = false;
		}
		return ll;
	}
	if (index === 0) {
		if (out) {
			out.value = true;
		}
		return cons(value, ll.tail);
	}
	return cons(ll.head, llSetIndex(ll.tail, index - 1, value, out));
};

export const llSpliceDelete = <T>(ll: LL<T>, deleteCount: number): LL<T> => {
	if (ll === null) {
		return null;
	}

	if (deleteCount === 0) {
		return ll;
	}

	return llSpliceDelete(ll.tail, deleteCount - 1);
};

export const llFromArray = <T>(arr: T[]): LL<T> => {
	if (arr.length === 0) {
		return null;
	}

	if (arr.length === 1) {
		return cons(arr[0], null);
	}

	let res: LL<T> = null;
	for (let i = arr.length - 1; i >= 0; i--) {
		res = cons(arr[i], res);
	}
	return res;
};

export const llSplice = <T>(
	ll: LL<T>,
	start: number,
	deleteCount: number,
	items: T[],
): LL<T> => {
	if (ll === null) {
		if (items.length > 0) {
			return llFromArray(items);
		}
		return null;
	}

	if (start > 0) {
		return cons(ll.head, llSplice(ll.tail, start - 1, deleteCount, items));
	}

	let current = llSpliceDelete(ll, deleteCount);
	for (let i = items.length - 1; i >= 0; i--) {
		current = cons(items[i], current);
	}
	return current;
};

const _emptyArray = Object.freeze([] as never[]);
const _arrayCache = new WeakMap<LLNode<unknown>, ReadonlyArray<unknown>>();
export const llToArray = <T>(ll: LL<T>): ReadonlyArray<T> => {
	if (ll === null) {
		return _emptyArray;
	}
	const arr = _arrayCache.get(ll);
	if (arr) {
		return arr as ReadonlyArray<T>;
	}

	const arr1: T[] = [];
	let current: LLNode<T> | null = ll;
	while (current !== null) {
		arr1.push(ll.head);
		current = ll.tail;
	}

	_arrayCache.set(ll, Object.freeze(arr1));
	return arr1;
};

export const llFromIterable = <T>(arr?: T[] | Iterable<T> | null): LL<T> => {
	if (!arr) {
		return null;
	}

	if (Array.isArray(arr)) {
		return llFromArray(arr);
	}

	return llFromArray([...arr]);
};

export const isLL = <T>(value: unknown): value is LL<T> => {
	return value === null || (typeof value === "object" && "head" in value);
};
