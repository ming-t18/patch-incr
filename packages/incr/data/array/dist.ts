/**
 * Distribute functions
 *
 * Given a value and a list, distribute the value into each element of the list.
 *
 * This function is necessary to implement list processing without the need for
 * closures. Unlike using `bind`, distribute functions allows the list processing
 * (`map` or `filter`) to be incremental over the distributed value.
 *
 * `distl` and `distr` are originally defined in John Backus's FP language due to
 * its lack of closures.
 *
 * @module
 */
import { CannotReduce, PatchOp, reducePatchesNoOutput } from "../patch";
import type { Merged } from "../struct/merge";
import type { IF } from "../types";

export const distl = <Elem, Dist>(): IF<[Dist, Elem[]], [Dist, Elem][]> => {
	const evaluateDistl = ([d, xs]: [Dist, Elem[]]): [Dist, Elem][] =>
		xs.map((x) => [d, x]);

	const forwardDistl = reducePatchesNoOutput(
		evaluateDistl,
		([d, xs], entry) => {
			const { path, op } = entry;
			if (path.length === 0) {
				return CannotReduce;
			}

			const [side, ...rest] = path;
			if (side === 0) {
				return xs.map((_, i) => ({
					...entry,
					path: [i, 0, ...rest],
				}));
			}

			if (side !== 1) {
				throw new Error("distl: invalid tuple index");
			}

			if (rest.length === 0) {
				// entire array replaced
				return CannotReduce;
			}

			if (rest.length === 1) {
				if (op === PatchOp.Replace || op === PatchOp.Add) {
					return [
						{
							...entry,
							path: rest,
							value: [d, entry.value as Elem],
						},
					];
				} else if (op === PatchOp.Remove) {
					return [
						{
							...entry,
							path: rest,
						},
					];
				}
				return CannotReduce;
			}

			return [
				{
					...entry,
					path: [rest[0], 1, ...rest.slice(1)],
				},
			];
		},
	);
	return { evaluate: evaluateDistl, forward: forwardDistl };
};

export const distr = <Elem, Dist>(): IF<[Elem[], Dist], [Elem, Dist][]> => {
	const evaluateDistr = ([xs, d]: [Elem[], Dist]): [Elem, Dist][] =>
		xs.map((x) => [x, d]);

	const forwardDistr = reducePatchesNoOutput(
		evaluateDistr,
		([xs, d], entry) => {
			const { path, op } = entry;
			if (path.length === 0) {
				return CannotReduce;
			}

			const [side, ...rest] = path;
			if (side === 1) {
				return xs.map((_, i) => ({
					...entry,
					path: [i, 1, ...rest],
				}));
			}

			if (side !== 0) {
				throw new Error("distr: invalid tuple index");
			}

			if (rest.length === 0) {
				// entire array replaced
				return CannotReduce;
			}

			if (rest.length === 1) {
				if (op === PatchOp.Replace || op === PatchOp.Add) {
					return [
						{
							...entry,
							path: rest,
							value: [entry.value as Elem, d],
						},
					];
				} else if (op === PatchOp.Remove) {
					return [
						{
							...entry,
							path: rest,
						},
					];
				}
				return CannotReduce;
			}

			return [
				{
					...entry,
					path: [rest[0], 0, ...rest.slice(1)],
				},
			];
		},
	);
	return { evaluate: evaluateDistr, forward: forwardDistr };
};

export const distAssign = <
	Elem extends Record<string, unknown>,
	Key extends string,
	Dist,
>(
	key: Key,
): IF<[Elem[], Dist], Merged<Elem, Record<Key, Dist>>[]> => {
	const evaluateDistAssign = ([xs, d]: [Elem[], Dist]): Merged<
		Elem,
		Record<Key, Dist>
	>[] => xs.map((x) => ({ ...x, [key]: d }));
	const forwardDistAssign = reducePatchesNoOutput(
		evaluateDistAssign,
		([xs, d], entry) => {
			const { path, op } = entry;
			if (path.length === 0) {
				return CannotReduce;
			}

			const [side, ...rest] = path;
			if (side === 1) {
				return xs.map((_, i) => ({
					...entry,
					path: [i, key, ...rest],
				}));
			}

			if (side !== 0) {
				throw new Error("distAssign: invalid tuple index");
			}

			if (rest.length === 0) {
				// entire array replaced
				return CannotReduce;
			}

			if (rest.length === 1) {
				if (op === PatchOp.Replace || op === PatchOp.Add) {
					return [
						{
							...entry,
							path: rest,
							value: { ...(entry.value as Elem), [key]: d },
						},
					];
				} else if (op === PatchOp.Remove) {
					return [
						{
							...entry,
							path: rest,
						},
					];
				}
				return CannotReduce;
			}

			return [
				{
					...entry,
					path: rest,
				},
			];
		},
	);
	return { evaluate: evaluateDistAssign, forward: forwardDistAssign };
};
