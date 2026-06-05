import { getReplaceOnly, isReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import type {
	AnyApply,
	InferApplyChange,
	InferApplyValue,
	ReplaceOnly,
} from "@/types/algebra";
import type { DeriveRecordChange, DeriveRecordValue, Record$ } from "./types";

export class ARecord<
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> implements Record$<Map, Key>
{
	readonly keys: Key[];
	public readonly $type = "record";
	public constructor(public readonly shape: Map) {
		this.keys = Object.keys(shape) as never[];
	}
	apply(
		value: DeriveRecordValue<Map, Key>,
		change: DeriveRecordChange<Map, Key>,
	): DeriveRecordValue<Map, Key> {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly(change)) {
			return getReplaceOnly(change);
		}

		const { shape, keys } = this;
		let changed = false;
		type R = DeriveRecordValue<Map, Key>;
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
	}
	fromReplace(d: DeriveRecordValue<Map, Key>): DeriveRecordChange<Map, Key> {
		return makeReplaceOnly(d);
	}

	isReplace(
		d: DeriveRecordChange<Map, Key>,
	): ReplaceOnly<DeriveRecordValue<Map, Key>> | null {
		if (d === null) {
			return null;
		}
		if (isReplaceOnly(d)) {
			return d;
		}
		return null;
	}
	public readonly empty: DeriveRecordChange<Map, Key> = null;
	combine(
		d1: DeriveRecordChange<Map, Key>,
		d2: DeriveRecordChange<Map, Key>,
	): DeriveRecordChange<Map, Key> {
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
			return makeReplaceOnly(this.apply(getReplaceOnly(d1), d2));
		}

		const { keys, shape } = this;
		const d3: Partial<DeriveRecordChange<Map, Key>> = { ...d1 };
		for (const key of keys) {
			// @ts-expect-error Can't be checked (existential type)
			d3[key] = d2[key] ? shape[key].combine(d1[key], d2[key]) : d1[key];
		}
		return d3 as DeriveRecordChange<Map, Key>;
	}
	isEmpty(change: DeriveRecordChange<Map, Key>): boolean {
		if (change === null) {
			return true;
		}
		if (isReplaceOnly(change)) {
			return false;
		}

		const { shape, keys } = this;
		return keys.every(
			(k) => !Object.hasOwn(change, k) || shape[k].isEmpty(change[k]),
		);
	}

	fromMap(
		md: { readonly [k in Key]?: InferApplyChange<Map[k]> | undefined },
	): DeriveRecordChange<Map, Key> {
		const m1: Partial<DeriveRecordChange<Map, Key>> = {};
		for (const key of this.keys) {
			if (Object.hasOwn(md, key)) {
				// @ts-expect-error Indexing by key
				m1[key] = md[key];
			}
		}
		return m1 as DeriveRecordChange<Map, Key>;
	}
	fromMapReplace(
		mr: { readonly [k in Key]?: InferApplyValue<Map[k]> | undefined },
	): DeriveRecordChange<Map, Key> {
		const m1: Partial<DeriveRecordChange<Map, Key>> = {};
		for (const key of this.keys) {
			if (Object.hasOwn(mr, key)) {
				// @ts-expect-error Indexing by key
				m1[key] = this.shape[key].fromReplace(mr[key]);
			}
		}
		return m1 as DeriveRecordChange<Map, Key>;
	}
}
export const record = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
>(
	map: Map,
) => new ARecord(map);
