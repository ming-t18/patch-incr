import type { DeriveRecordChange, DeriveRecordValue } from "@/record/types";
import type { AnyApply, Apply } from "@/types/algebra";

export interface ProductApply<
	Prod,
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> extends Apply<Prod, DeriveRecordChange<DeriveRecordValue<Map>>> {}
