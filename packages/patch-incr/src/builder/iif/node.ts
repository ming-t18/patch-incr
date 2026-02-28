import type { Path } from "@/patch";
import {
	getTrackedPath,
	isPathTracker,
	type OnApplyReturn,
	type PathTracker,
	type TrackedParams,
	type TrackedPath,
	trackedProxy,
} from "@/tracked";
import type { AnyIF, IF } from "@/types";
import {
	APPLY,
	type ApplyElem,
	CONST,
	type ConstElem,
	FORK,
	type ForkElem,
	type Node,
} from "./types";

export const METHOD_HANDLERS: Record<
	string,
	// biome-ignore lint/suspicious/noExplicitAny: avoid checking parameter variance
	(...args: any[]) => (input: any) => unknown
> = {};

const HANDLER: TrackedParams = {
	onApply: (
		_target: PathTracker<unknown>,
		path: TrackedPath,
		func: string,
		args: unknown[],
	): OnApplyReturn => {
		if (func in METHOD_HANDLERS) {
			const result = METHOD_HANDLERS[func](...args)(makeNode(path));
			return { type: "value", result };
		}
		throw new Error(`apply: unsupported: ${func}`);
	},
};

export const makeNode = <Output = unknown>(
	path = [] as unknown[],
): Output & Node<Output> => trackedProxy(path, HANDLER);

export const makeApplyNode = <Input = unknown, Output = unknown>(
	func: IF<Input, Output>,
): Output & Node<Output> => trackedProxy([{ [APPLY]: func }], HANDLER);

export const composeWith = <Input, Output>(
	input: Node<Input>,
	func: IF<Input, Output>,
): Node<Output> =>
	makeNode([...(getTrackedPath(input) ?? []), { [APPLY]: func }]);

export const makeFork = <Args extends unknown[]>(
	...nodes: { [key in keyof Args]: Node<Args[key]> }
): Node<Args> => {
	return makeNode([{ [FORK]: nodes.map((n) => getTrackedPath(n) ?? []) }]);
};

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

export function isForkElem(value: unknown): value is ForkElem {
	return !!value && FORK in (value as ForkElem);
}

export function isNode<T>(value: unknown): value is T & Node<T> {
	return isPathTracker(value);
}

function isPathElem(value: unknown): value is string | number {
	return typeof value === "number" || typeof value === "string";
}

export const analyzePath = (
	path: unknown[],
): (ConstElem | ApplyElem | ForkElem | Path)[] => {
	const res: (ConstElem | ApplyElem | ForkElem | Path)[] = [];
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
		if (isApplyElem(e) || isConstElem(e) || isForkElem(e)) {
			res.push(e as ConstElem | ApplyElem | ForkElem);
			i++;
			continue;
		}

		throw new Error("Invalid path element");
	}

	return res;
};
