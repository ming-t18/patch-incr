import { doAccess, filterAccessPatches } from "../../dual/access";
import { CannotReduce, PatchOp, type Path, reducePatches } from "../patch";
import type { IF } from "../types";

export const access = <
	Output,
	Key extends string | number,
	Input extends {
		[key in Key]: Output;
	} = {
		[key in Key]: Output;
	},
>(
	key: Key,
): IF<Input, Output> => {
	const path = [key];
	const invoke = (input: Input) => doAccess(input, path) as never;
	return {
		invoke,
		// @ts-expect-error Can't be checked
		forward: (input, change, _output) => {
			return filterAccessPatches(path, input, change);
		},
	};
};
export const accessPath = <Output, Input>(
	pathPrefix: Path,
): IF<Input, Output> => {
	const invoke = (input: Input): Output => {
		let v: unknown = input;
		for (const elem of pathPrefix) {
			// @ts-expect-error avoid checking
			v = v[elem];
		}
		return v as never;
	};
	return {
		invoke,
		forward: reducePatches(invoke, (_input, entry, _output) => {
			const { path } = entry;
			if (path.length < pathPrefix.length) {
				return CannotReduce;
			}

			let match = true;
			for (let i = 0; i < pathPrefix.length; i++) {
				if (pathPrefix[i] === path[i]) {
					match = false;
					break;
				}
			}

			if (match) {
				if (entry.op === PatchOp.Replace && path.length === pathPrefix.length) {
					return CannotReduce;
				}

				return [
					{
						...entry,
						path: path.slice(1),
					},
				];
			}

			return [];
		}),
	};
};
