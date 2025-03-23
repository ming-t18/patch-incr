export interface Cell<T> {
	value: T;
}

export const WeakMemo = Symbol("WeakMemo");

export interface MemoFn<X extends WeakKey, Y> {
	(input: X): Y;
	[WeakMemo]: WeakMap<X, Y>;
}

export const isMemoFn = <X extends WeakKey, Y>(
	f: (input: X) => Y,
): f is MemoFn<X, Y> => {
	return WeakMemo in f && f[WeakMemo] instanceof WeakMap;
};
