import { getReplaceOnly, isReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import type { AnyApply, ReplaceOnly } from "@/types/algebra";
import type {
	DeriveRecordChange,
	DeriveRecordValue,
	Record$,
	RecordApply,
} from "./types";

export const recordApply = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
>(
	shape: Map,
): RecordApply<Map, Key> => {
	type R = DeriveRecordValue<Map, Key>;
	type DR = DeriveRecordChange<Map, Key>;

	const keys: Key[] = Object.keys(shape) as never[];
	const apply = (value: R, change: DR): R => {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly(change)) {
			return getReplaceOnly(change);
		}

		let changed = false;
		const value1: Partial<R> = { ...value };
		for (const key of keys) {
			if (!Object.hasOwn(change, key)) {
				continue;
			}
			const subChange = change[key];
			if (shape[key].isEmpty(subChange)) {
				continue;
			}
			value1[key] = shape[key].apply(value1[key], subChange);
			changed = true;
		}

		if (!changed) {
			return value;
		}
		return value1 as R;
	};

	return {
		apply,
		fromReplace: makeReplaceOnly,
		isReplace: (d: DR): ReplaceOnly<R> | null => {
			if (d === null) {
				return null;
			}
			if (isReplaceOnly(d)) {
				return d;
			}
			return null;
		},
		empty: null,
		combine: (d1: DR, d2: DR): DR => {
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

			const d3: Partial<DR> = { ...d1 };
			for (const key of keys) {
				// @ts-expect-error Can't be checked (existential type)
				d3[key] = d2[key] ? shape[key].combine(d1[key], d2[key]) : d1[key];
			}
			return d3 as DR;
		},
		isEmpty: (change: DR): boolean => {
			if (change === null) {
				return true;
			}
			if (isReplaceOnly(change)) {
				return false;
			}

			return keys.every(
				(k) => !Object.hasOwn(change, k) || shape[k].isEmpty(change[k]),
			);
		},
	};
};

export const record = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
>(
	map: Map,
): Record$<Map, Key> => {
	type DR = DeriveRecordChange<Map, Key>;
	const apply = recordApply<Map, Key>(map);
	const keys: Key[] = Object.keys(map) as never[];
	return {
		...apply,
		$type: "record",
		shape: map,
		fromMap: (md) => {
			const m1: Partial<DR> = {};
			for (const key of keys) {
				if (Object.hasOwn(md, key)) {
					// @ts-expect-error Indexing by key
					m1[key] = md[key];
				}
			}
			return m1 as DR;
		},
		fromMapReplace: (mr) => {
			const m1: Partial<DR> = {};
			for (const key of keys) {
				if (Object.hasOwn(mr, key)) {
					// @ts-expect-error Indexing by key
					m1[key] = map[key].fromReplace(mr[key]);
				}
			}
			return m1 as DR;
		},
	};
};
