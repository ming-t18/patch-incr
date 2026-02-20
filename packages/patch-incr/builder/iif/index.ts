import type { AnyIF, IF } from "../../types";
import { identity } from "..";
import { access, accessPath } from "../struct";
import { makeTrackedTemplate } from "../struct/trackedTemplate";

const pathToIF = <Input extends WeakKey>(
	path: unknown[],
): IF<Input, unknown> => {
	if (path.length === 0) {
		return identity() as AnyIF;
	}
	if (path.length === 1) {
		if (!(typeof path[0] === "string" || typeof path[0] === "number")) {
			throw new Error("pathToIF: invalid path element");
		}
		return access(path[0]) as AnyIF;
	}
	return accessPath(path as never);
};

/**
 * "Imitative incremental function"
 *
 * An `IF` that can be constructed by evaluating the non-incremental version
 * once on a proxy value then analyzing the results.
 *
 */
export const iif = <Input extends WeakKey, Output>(
	func: (input: Input) => Output,
): IF<Input, Output> => {
	return makeTrackedTemplate(func, pathToIF);
};
