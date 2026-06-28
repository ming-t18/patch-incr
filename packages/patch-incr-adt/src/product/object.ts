import type {
	DeriveRecordChangeNoReplace,
	DeriveRecordValue,
} from "@/record/types";
import { getReplaceOnly, isReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import {
	type AnyApply,
	type Apply,
	BaseApplyClass,
	type DRO,
	type InferApplyValue,
	type ReplaceOnly,
} from "@/types";
import type {
	ApplyProductShaped,
	DeriveProductChange,
	DeriveProductShapedChange,
} from "./types";

export interface HasFromToRecord<
	Prod,
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> {
	readonly fromRecord: (recordForm: DeriveRecordValue<Shape, Key>) => Prod;
	readonly toRecord: (prod: Prod) => DeriveRecordValue<Shape, Key>;
}

export abstract class BaseProductShaped<
		Prod,
		Shape extends Record<Key, AnyApply>,
		Key extends keyof Shape = keyof Shape,
	>
	extends BaseApplyClass<Prod, DeriveProductChange<Prod, Shape, Key>, null>
	implements
		Apply<Prod, DeriveProductChange<Prod, Shape, Key>>,
		ApplyProductShaped<Prod, Shape, Key>
{
	declare "~apply": {
		readonly value: Prod;
		readonly change: DeriveProductChange<Prod, Shape, Key>;
	};

	constructor(
		readonly shape: Shape,
		readonly keys = Object.keys(shape) as never[] as Readonly<Key[]>,
	) {
		super(null);
	}
	/** Converts from record-form to the `Prod`. Inverse of `toRecord`. */
	abstract readonly fromRecord?: (
		recordForm: DeriveRecordValue<Shape, Key>,
	) => Prod;
	/** Converts from the `Prod` to the record-form. Inverse of `fromRecord`. */
	abstract readonly toRecord?: (prod: Prod) => DeriveRecordValue<Shape, Key>;

	abstract assign(
		value: Prod,
		change: Readonly<Partial<{ [k in Key]: InferApplyValue<Shape[k]> }>>,
	): Prod;
	abstract get<K extends Key>(value: Prod, key: K): InferApplyValue<Shape[K]>;

	apply(value: Prod, change: DeriveProductChange<Prod, Shape, Key>): Prod {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly<Prod>(change)) {
			return getReplaceOnly(change);
		}

		const change1: Record<Key, never> = {} as never;
		for (const key of this.keys) {
			if (!Object.hasOwn(change, key)) continue;

			const changeKey = change[key];
			change1[key] = this.shape[key].apply(
				this.get(value, key as never),
				changeKey,
			);
		}
		return this.assign(value, change1);
	}

	override canApply(
		value: Prod,
		change: DeriveProductChange<Prod, Shape, Key>,
	): boolean {
		if (change === null || isReplaceOnly(change)) return true;
		for (const key of this.keys) {
			if (!Object.hasOwn(change, key)) continue;
			if (!this.shape[key].canApply(this.get(value, key), change[key])) {
				return false;
			}
		}
		return true;
	}

	fromReplace(value: Prod): DeriveRecordChangeNoReplace<Shape> | DRO<Prod> {
		return makeReplaceOnly(value);
	}

	isReplace(
		change: DeriveProductChange<Prod, Shape, Key>,
	): ReplaceOnly<Prod> | null {
		if (isReplaceOnly(change)) {
			return change;
		}
		return null;
	}
	combine(
		a: DeriveProductChange<Prod, Shape, Key>,
		b: DeriveProductChange<Prod, Shape, Key>,
	): DeriveProductChange<Prod, Shape, Key> {
		if (a === null) {
			return b;
		}
		if (b === null) {
			return a;
		}
		if (isReplaceOnly(b)) {
			return b;
		}
		if (isReplaceOnly(a)) {
			return makeReplaceOnly(this.apply(getReplaceOnly(a), b));
		}
		const c = { ...a } as Partial<DeriveRecordChangeNoReplace<Shape>>;
		for (const k of this.keys) {
			const key = k as Key;
			if (!Object.hasOwn(b, key)) {
				continue;
			}
			if (!Object.hasOwn(c, key)) {
				c[key] = b[key];
				continue;
			}
			c[key] = this.shape[key].combine(c[key], b[key]);
		}
		return c;
	}
	isEmpty(change: DeriveProductChange<Prod, Shape, Key>): boolean {
		if (change === null) {
			return true;
		}
		if (isReplaceOnly(change)) {
			return false;
		}
		for (const key of this.keys) {
			if (Object.hasOwn(change, key)) {
				return false;
			}
		}
		return true;
	}

	project<KeySub extends Key = Key>(
		keys: KeySub[],
		change: DeriveProductChange<Prod, Shape, Key>,
	): DeriveProductShapedChange<Shape, KeySub> {
		const change1: DeriveProductShapedChange<Shape, KeySub> = {} as never;
		if (this.isEmpty(change)) {
			for (const key of keys) {
				// @ts-expect-error Bypassing `readonly`
				change1[key] = this.shape[key as KeySub].empty;
			}
			return change1;
		}

		if (isReplaceOnly(change)) {
			const repl = getReplaceOnly(change);

			for (const key of keys) {
				// @ts-expect-error Bypassing `readonly`
				change1[key] = this.shape[key as KeySub].fromReplace(
					this.get(repl, key),
				);
			}
		}

		for (const key of keys) {
			// @ts-expect-error Bypassing `readonly`
			change1[key] = change[key as KeySub];
		}

		return change1;
	}

	mapShape<Reshaped extends Record<Key, unknown>>(
		fn: <K1 extends Key>(key: K1, value: Shape[K1]) => Reshaped[K1],
	): Reshaped {
		const res = {} as Partial<Reshaped>;
		for (const k of this.keys) {
			res[k] = fn(k, this.shape[k]);
		}
		return res as Reshaped;
	}
}
