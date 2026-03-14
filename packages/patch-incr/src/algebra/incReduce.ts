import { PatchBuilder, type PatchEntry, type Patches } from "@/patch";
import * as ps from "@/patchSchema";
import type { ReduceAlgebra } from "./reduceAlgebra";
import { getReplaceOnly, isReplaceOnly } from "./replaceOnly";

/** Like `ReduceAlgebra` except changes can be applied incrementally.
 * @see ReduceAlgebra
 */
export interface IncReduceAlgebra<Acc, T, DAcc = Patches<Acc>, DT = Patches<T>>
	extends ReduceAlgebra<Acc, T> {
	forwardInternal: (acc: Acc, current: T, dt: DT) => DAcc;
	forwardAdd: (acc: Acc, valueToAdd: T) => DAcc;
	forwardRemove: (acc: Acc, valueToRemove: T) => DAcc;
	forwardReplace: (acc: Acc, prevValue: T, nextValue: T) => DAcc;
}

export const objectFromEntriesAlgebra = <K extends string | number, V>(
	init = {} as Record<K, V>,
): IncReduceAlgebra<Record<K, V>, [K, V]> => {
	const keySchema = ps.atomic<K>();
	const valueSchema = ps.atomic<V>();
	const pairSchema = ps.tuple(keySchema, valueSchema);

	const forwardReplace0 = ([k0]: [K, V], [k1, v1]: [K, V]) => {
		if (k0 === k1) {
			return PatchBuilder.empty<Record<K, V>>().replace([k0], v1).build();
		}
		return PatchBuilder.empty<Record<K, V>>()
			.remove([k0])
			.add([k1], v1)
			.build();
	};
	return {
		init,
		replace: (
			acc: Record<K, V>,
			[k0]: [K, V],
			[k1, v1]: [K, V],
		): Record<K, V> => {
			if (k0 === k1) {
				return { ...acc, [k1]: v1 };
			}
			const acc1 = { ...acc };
			delete acc1[k0];
			return { ...acc1, [k1]: v1 };
		},
		add: (acc: Record<K, V>, [k, v]: [K, V]): Record<K, V> => {
			return { ...acc, [k]: v };
		},
		remove: (acc: Record<K, V>, [k]: [K, V]): Record<K, V> => {
			const acc1 = { ...acc };
			delete acc1[k];
			return acc1;
		},
		forwardInternal: (
			_: Record<K, V>,
			pair: [K, V],
			dPair: Patches<[K, V]>,
		): Patches<Record<K, V>> => {
			const res = pairSchema.analyze(dPair);
			if (res === null) {
				return [];
			}
			if (isReplaceOnly(res)) {
				return forwardReplace0(pair, getReplaceOnly(res));
			}
			const [dKey, dValue] = [res[0]?.inner, res[1]?.inner];
			const key0 = pair[0];
			if (dKey && !keySchema.isEmpty(dKey)) {
				const key1 = keySchema.apply(pair[0], dKey);
				if (key1 !== key0) {
					const pair1 = pairSchema.apply(pair, dPair);
					return forwardReplace0(pair, pair1);
				}
			}
			// below: key is not changing

			if (!dValue || valueSchema.isEmpty(dValue)) {
				return [];
			}
			return (dValue ?? []).map(
				(entry) =>
					({
						...entry,
						path: [key0, ...entry.path],
					}) as PatchEntry<Record<K, V>>,
			);
		},
		forwardAdd: (_: Record<K, V>, [k, v]: [K, V]): Patches<Record<K, V>> =>
			PatchBuilder.empty<Record<K, V>>().add([k], v).build(),
		forwardRemove: (_: Record<K, V>, [k]: [K, V]): Patches<Record<K, V>> =>
			PatchBuilder.empty<Record<K, V>>().remove([k]).build(),
		forwardReplace: (
			_: Record<K, V>,
			pair0: [K, V],
			pair1: [K, V],
		): Patches<Record<K, V>> => forwardReplace0(pair0, pair1),
	};
};
