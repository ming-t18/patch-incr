import { type Path, patchableEntries } from "../../patch";
import { GetTracked, isPathTracker, type PathTracker } from "../../tracked";
import type { IF } from "../../types";
import { assign } from "../struct";
import { makeNode } from "./node";

function* findTrackedPaths(
	obj: unknown,
	path: Path = [],
): Generator<{ path: Path; value: { [GetTracked]: PathTracker } }, void, void> {
	if (isPathTracker(obj)) {
		yield { path, value: obj };
		return;
	}

	if (!(obj !== null && typeof obj === "object")) {
		return;
	}

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			yield* findTrackedPaths(obj[i], [...path, i]);
		}
		return;
	}

	for (const [key, objValue] of patchableEntries(obj)) {
		yield* findTrackedPaths(objValue, [...path, key]);
	}
}

export const makeTrackedTemplate = <Input = unknown, Output = unknown>(
	getInitial: (input: Input) => Output,
	makeIF: (trackedPath: unknown[]) => IF<Input, unknown>,
): IF<Input, Output> => {
	const obj = getInitial(makeNode<Input>());
	const changes: { path: Path; getValue: IF<Input, unknown> }[] = [];
	for (const { path, value } of findTrackedPaths(obj)) {
		changes.push({ path, getValue: makeIF(value[GetTracked]._path) });
	}

	return assign(() => getInitial(makeNode<Input>()), changes);
};
