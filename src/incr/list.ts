import {
	CannotReduce,
	type PatchEntry,
	PatchOp,
	type Patches,
	liftPatch,
	reducePatches,
	unliftPatch,
} from "./patch";
import type { IF } from "./types";

export const map = <Input, Output>(
	f: IF<Input, Output>,
): IF<Input[], Output[]> => {
	const invoke = (xs: Input[]) => xs.map((x) => f.invoke(x));
	return {
		invoke,
		forward: reducePatches(invoke, (input, entry: PatchEntry, output) => {
			const { path, op } = entry;
			if (path.length === 0) {
				return CannotReduce;
			}

			if (path.length === 1) {
				if (op === PatchOp.Replace || op === PatchOp.Add) {
					return [
						{
							...entry,
							value: f.invoke(entry.value as Input),
						},
					];
				}
				if (op === PatchOp.Remove) {
					return [entry];
				}
				throw new Error("Invalid op");
			}

			const index = entry.path[0];
			const forwarded = f.forward(
				input[index as number],
				unliftPatch(index, [entry]),
				output[index as number],
			);
			return liftPatch(index, forwarded);
		}),
	};
};

export const scan = <T, Acc>(
	func: (acc: Acc, value: T) => Acc,
	init: Acc,
): IF<T[], Acc[]> => {
	const invoke = (xs: T[]): Acc[] => {
		const values = [init];
		for (let i = 0; i < xs.length; i++) {
			values.push(func(values[i], xs[i]));
		}
		return values;
	};
	return {
		invoke,
		forward: reducePatches(invoke, (input, entry, output) => {
			return CannotReduce;
		}),
	};
};

export const concat = <T>(): IF<T[][], [number[], T[]]> => {
	const invoke = (xs: T[][]): [number[], T[]] => {
		const lens: number[] = [];
		const combined: T[] = [];
		for (let i = 0; i < xs.length; i++) {
			combined.push(...xs[i]);
			lens.push(xs[i].length);
		}
		return [lens, combined];
	};
	return {
		invoke,
		forward: reducePatches(invoke, (input, entry, output) => {
			return CannotReduce;
		}),
	};
};
