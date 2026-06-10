import { BaseProductShaped } from "@/product/shaped";
import type {
	AnyApply,
	InferApplyChange,
	InferApplyValue,
} from "@/types/algebra";
import type { DeriveRecordChange, DeriveRecordValue, Record$ } from "./types";

export class ARecord<
		Map extends Record<Key, AnyApply>,
		Key extends keyof Map = keyof Map,
	>
	extends BaseProductShaped<DeriveRecordValue<Map, Key>, Map, Key>
	implements Record$<Map, Key>
{
	readonly $type = "record";
	constructor(shape: Map, keys: Key[] = Object.keys(shape) as never[]) {
		super(shape, keys);
	}

	override assign(
		value: DeriveRecordValue<Map, Key>,
		change: Readonly<Partial<{ [k in Key]: InferApplyValue<Map[k]> }>>,
	): DeriveRecordValue<Map, Key> {
		const value1: typeof value = Array.isArray(value)
			? ([...value] as never)
			: ({ ...value } as never);
		for (const key of Object.keys(change)) {
			// @ts-expect-error Bypassing readonly
			value1[key] = change[key];
		}
		return value1;
	}

	override get<K extends Key>(
		value: DeriveRecordValue<Map, Key>,
		key: K,
	): InferApplyValue<Map[K]> {
		return value[key];
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
