import I from "immutable";

export interface ListNode<T = unknown> {
	array: ListNode<T>[] | (T | undefined)[];
}

export interface HasListNode<T = unknown> {
	_root?: ListNode<T> | null;
	_tail?: ListNode<T> | null;
}

export const VNode = (I.List([null]) as never as { _tail: object })._tail
	.constructor;

export function isListNode<T>(value: unknown): value is ListNode<T> {
	return value instanceof VNode;
}
