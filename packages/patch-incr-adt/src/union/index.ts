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
	UnionChangeEntry,
} from "./types";

export class UnionCaseError extends TypeError {
	constructor(
		readonly case1: string | number | symbol,
		readonly case2: string | number | symbol,
	) {
		super(
			`invalid union case: expected ${JSON.stringify(case1)}, actual ${JSON.stringify(case2)}.`,
		);
	}
}

export type * from "./types";

export class AUnion<
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
> implements Union$<Map, Key>
{
	declare "~apply": {
		readonly value: DeriveUnionValue<Map, Key>;
		readonly change: DeriveUnionChange<Map, Key>;
	};
	readonly $type = "union";
	readonly empty: DeriveUnionChange<Map, Key> = null;

	constructor(
		readonly shape: Map,
		readonly getDiscrimant: (value: DeriveUnionValue<Map, Key>) => Key,
	) {}

	apply(
		value: DeriveUnionValue<Map, Key>,
		change: DeriveUnionChange<Map, Key>,
	): DeriveUnionValue<Map, Key> {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly(change)) {
			return getReplaceOnly(change);
		}

		const changeDisc: Key = change.type;
		const disc: Key = this.getDiscrimant(value);
		if (disc !== changeDisc) {
			throw new UnionCaseError(disc, changeDisc);
		}

		return this.shape[disc].apply(value, change.change as never);
	}

	fromReplace(value: DeriveUnionValue<Map, Key>): DeriveUnionChange<Map, Key> {
		return makeReplaceOnly(value);
	}

	isReplace(
		d: DeriveUnionChange<Map, Key>,
	): ReplaceOnly<DeriveUnionValue<Map, Key>> | null {
		if (d === null) {
			return null;
		}
		if (isReplaceOnly(d)) {
			return d;
		}
		return null;
	}

	combine(
		d1: DeriveUnionChange<Map, Key>,
		d2: DeriveUnionChange<Map, Key>,
	): DeriveUnionChange<Map, Key> {
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

		const disc1: Key = d1.type;
		const disc2: Key = d2.type;
		if (disc1 !== disc2) {
			throw new UnionCaseError(disc1, disc2);
		}
		return {
			// @ts-expect-error Can't be checked (existential type)
			type: disc1,
			change: this.shape[disc1].combine(d1.change, d2.change),
		};
	}

	isEmpty(change: DeriveUnionChange<Map, Key>): boolean {
		if (change === null) {
			return true;
		}
		if (isReplaceOnly(change)) {
			return false;
		}

		const disc: Key = change.type;
		return this.shape[disc].isEmpty(change.change);
	}

	fromChangeCase<K extends Key>(
		type: K,
		change: InferApplyChange<Map[K]>,
	): UnionChangeEntry<K, InferApplyChange<Map[K]>> {
		return {
			type,
			change,
		};
	}

	fromReplaceCase<K extends Key>(
		type: K,
		replace: InferApplyValue<Map[K]>,
	): UnionChangeEntry<K, InferApplyChange<Map[K]>> {
		return {
			type,
			change: this.shape[type].fromReplace(replace),
		};
	}
}

export const union = <
	Map extends Record<Key, AnyApply>,
	Key extends keyof Map = keyof Map,
>(
	map: Map,
	getDiscrimant: (value: DeriveUnionValue<Map, Key>) => Key,
) => new AUnion(map, getDiscrimant);
