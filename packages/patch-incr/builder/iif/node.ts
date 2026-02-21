import type { Path } from "@/patch";
import { isPathTracker, trackedProxy } from "@/tracked";
import type { AnyIF } from "@/types";
import {
	APPLY,
	type ApplyElem,
	CONST,
	type ConstElem,
	type Node,
} from "./types";

export const makeNode = <Output = unknown>(): Output & Node<Output> =>
	trackedProxy();

export const makeApplyNode = (func: AnyIF) => trackedProxy([[APPLY, func]]);

export function isConstElem<V = unknown>(
	value: unknown,
): value is ConstElem<V> {
	return !!value && CONST in (value as ConstElem);
}

export function isApplyElem<F extends AnyIF = AnyIF>(
	value: unknown,
): value is ApplyElem<F> {
	return !!value && APPLY in (value as ApplyElem);
}

export function isNode<T>(value: unknown): value is T & Node<T> {
	return isPathTracker(value);
}

function isPathElem(value: unknown): value is string | number {
	return typeof value === "number" || typeof value === "string";
}

export const analyzePath = (
	path: unknown[],
): (ConstElem | ApplyElem | Path)[] => {
	const res: (ConstElem | ApplyElem | Path)[] = [];
	const n = path.length;
	let i = 0;
	while (i < n) {
		if (isPathElem(path[i])) {
			const merged: Path = [];
			while (i < n && isPathElem(path[i])) {
				merged.push(path[i] as string | number);
				i++;
			}
			res.push(merged);
			continue;
		}

		const e = path[i];
		if (e && (CONST in (e as ConstElem) || APPLY in (e as ApplyElem))) {
			res.push(e as ConstElem | ApplyElem);
			i++;
			continue;
		}

		throw new Error("Invalid path element");
	}

	return res;
};
