import { getReplaceOnly, isReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import type {
	AnyApply,
	InferApplyChange,
	InferApplyValue,
	ReplaceOnly,
} from "@/types/algebra";
import type {
	DeriveUnionChange,
	DeriveUnionValue,
	Union$,
	UnionApply,
	UnionChangeEntry,
} from "./types";

export class UnionCaseError extends TypeError {
	constructor(
		public readonly case1: string | number | symbol,
		public readonly case2: string | number | symbol,
	) {
		super(
			`invalid union case: expected ${JSON.stringify(case1)}, actual ${JSON.stringify(case2)}.`,
		);
	}
}

export type * from "./types";

export const unionApply = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
>(
	shape: Map,
	getDiscrimant: (value: DeriveUnionValue<Map, Key>) => Key,
): UnionApply<Map, Key> => {
	type U = DeriveUnionValue<Map, Key>;
	type DU = DeriveUnionChange<Map, Key>;

	const apply = (value: U, change: DU): U => {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly(change)) {
			return getReplaceOnly(change);
		}

		const changeDisc: Key = change.type;
		const disc: Key = getDiscrimant(value);
		if (disc !== changeDisc) {
			throw new UnionCaseError(disc, changeDisc);
		}

		return shape[disc].apply(value, change.change as never);
	};

	return {
		apply,
		fromReplace: makeReplaceOnly,
		isReplace: (d: DU): ReplaceOnly<U> | null => {
			if (d === null) {
				return null;
			}
			if (isReplaceOnly(d)) {
				return d;
			}
			return null;
		},
		empty: null,
		combine: (d1: DU, d2: DU): DU => {
			if (d1 === null) {
				return d2;
			}
			if (d2 === null) {
				return d1;
			}
			if (isReplaceOnly(d2)) {
				return d2;
			}
			if (isReplaceOnly(d1)) {
				return makeReplaceOnly(apply(getReplaceOnly(d1), d2));
			}

			const disc1: Key = d1.type;
			const disc2: Key = d2.type;
			if (disc1 !== disc2) {
				throw new UnionCaseError(disc1, disc2);
			}
			return {
				// @ts-expect-error Can't be checked (existential type)
				type: disc1,
				change: shape[disc1].combine(d1.change, d2.change),
			};
		},
		isEmpty: (change: DU): boolean => {
			if (change === null) {
				return true;
			}
			if (isReplaceOnly(change)) {
				return false;
			}

			const disc: Key = change.type;
			return shape[disc].isEmpty(change.change);
		},
	};
};

export const union = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
>(
	map: Map,
	getDiscrimant: (value: DeriveUnionValue<Map, Key>) => Key,
): Union$<Map, Key> => {
	return {
		$type: "union",
		$: map,
		getDiscrimant,
		fromChangeCase: <K extends Key>(
			type: K,
			change: InferApplyChange<Map[K]>,
		): UnionChangeEntry<K, InferApplyChange<Map[K]>> => ({
			type,
			change,
		}),
		fromReplaceCase: <K extends Key>(
			type: K,
			replace: InferApplyValue<Map[K]>,
		): UnionChangeEntry<K, InferApplyChange<Map[K]>> => ({
			type,
			change: map[type].fromReplace(replace),
		}),
		...unionApply(map, getDiscrimant),
	};
};
