import type { Path } from "@/patch";
import type { AnyIF, IF } from "../../types";
import { constant, identity } from "..";
import { composeMemo } from "../compose";
import { access, accessPath, tupleFor } from "../struct";
import { setCompile } from "./compile";
import { analyzePath, isApplyElem, isConstElem, isForkElem } from "./node";
import { makeTrackedTemplate } from "./trackedTemplate";
import {
	APPLY,
	type ApplyElem,
	CONST,
	type ConstElem,
	FORK,
	type ForkElem,
	type IIF,
} from "./types";

const elemToIF = (e: ConstElem | ApplyElem | ForkElem | Path): AnyIF => {
	if (isConstElem(e)) {
		return constant(e[CONST]);
	}
	if (isApplyElem(e)) {
		return e[APPLY];
	}
	if (isForkElem(e)) {
		const fns = e[FORK].map(pathToIF);
		return tupleFor()(...fns);
	}

	return e.length === 0
		? identity()
		: e.length === 1
			? access(e[0])
			: accessPath(e);
};

const pathToIF = <Input extends WeakKey>(
	path: unknown[],
): IF<Input, unknown> => {
	if (path.length === 0) {
		return identity() as AnyIF;
	}

	const parts = analyzePath(path);
	let composed: AnyIF = elemToIF(parts[0]);
	for (let i = 1; i < parts.length; i++) {
		composed = composeMemo(composed, elemToIF(parts[i]));
	}
	return composed;
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
): IIF<Input, Output> => {
	return { ...makeTrackedTemplate(func, pathToIF), original: func };
};

setCompile(iif);
