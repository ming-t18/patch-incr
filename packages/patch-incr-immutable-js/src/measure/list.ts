import type { List } from "immutable";
import { type HasListNode, isListNode, type ListNode } from "@/types";
import type { Measure, MeasureList } from "./types";

export const measureList = <T, M>(
	{ zero, measure, combine }: Measure<T, M>,
	memo0?: WeakMap<ListNode, M>,
): MeasureList<T, M> => {
	const memo = memo0 ?? new WeakMap<ListNode, M>();

	const recurse = (node: ListNode<T>): M => {
		if (memo.has(node)) {
			return memo.get(node) as M;
		}

		if (node.array.length === 0) {
			return zero;
		}

		if (isListNode(node.array[0])) {
			const res: M = (node.array as ListNode<T>[]).reduce(
				(s: M, n: ListNode<T>) => combine(s, recurse(n)),
				zero,
			);
			memo.set(node, res);
			return res;
		}
		const res: M = (node.array as (T | undefined)[]).reduce(
			(s: M, v: T | undefined): M => {
				if (typeof v === "undefined") {
					return s;
				}
				return combine(s, measure(v));
			},
			zero,
		);
		memo.set(node, res);
		return res;
	};

	return (list: List<T>, start?: number, end?: number): M => {
		const list1 = list.slice(start, end) as HasListNode<T>;
		if (!list1._root) {
			if (!list1._tail) {
				return zero;
			}
			return recurse(list1._tail);
		}
		if (!list1._tail) {
			return recurse(list1._root);
		}
		return combine(recurse(list1._root), recurse(list1._tail));
	};
};
