import type { DeriveRecordChangeNoReplace } from "@/record/types";
import { getReplaceOnly, isReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import type {
	AnyApply,
	Apply,
	DRO,
	InferApplyValue,
	ReplaceOnly,
} from "@/types";
import type {
	ApplyProductShaped,
	DeriveProductChange,
	DeriveProductShapedChange,
} from "./types";

export abstract class BaseProductShaped<
	Prod,
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
> implements
		Apply<Prod, DeriveProductChange<Prod, Shape, Key>>,
		ApplyProductShaped<Prod, Shape, Key>
{
	constructor(
		readonly shape: Shape,
		readonly keys = Object.keys(shape) as never[] as Readonly<Key[]>,
	) {}

	abstract assign(
		value: Prod,
		change: Readonly<Partial<{ [k in Key]: InferApplyValue<Shape[k]> }>>,
	): Prod;
	abstract get<K extends Key>(value: Prod, key: K): InferApplyValue<Shape[K]>;

	readonly empty: DeriveRecordChangeNoReplace<Shape> | DRO<Prod> = null;

	apply(value: Prod, change: DeriveProductChange<Prod, Shape, Key>): Prod {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly<Prod>(change)) {
			return getReplaceOnly(change);
		}

		const change1: Record<Key, never> = Array.isArray(change)
			? ([] as never)
			: ({} as never);
		for (const key of this.keys) {
			if (!Object.hasOwn(change, key)) continue;
			// @ts-expect-error Can't be checked
			const changeKey: never = change[key];
			change1[key] = this.shape[key].apply(
				this.get(value, key as never),
				changeKey,
			);
		}
		return this.assign(value, change1);
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
			return a;
		}
		if (isReplaceOnly(a)) {
			return makeReplaceOnly(this.apply(getReplaceOnly(a), b));
		}
		const c = (Array.isArray(a) ? [...a] : { ...a }) as typeof a;
		for (const k of Object.keys(c)) {
			const key = k as Key;
			if (!Object.hasOwn(b, k)) continue;
			// @ts-expect-error Assigning c[key]
			c[key] = this.shape[key].combine(c[k], b[k]);
		}
		return c;
	}
	isEmpty(change: DeriveProductChange<Prod, Shape, Key>) {
		return change === null;
	}

	project<KeySub extends Key = Key>(
		keys: KeySub[],
		change: DeriveProductChange<Prod, Shape, Key>,
	): DeriveProductShapedChange<Shape, KeySub> {
		const change1: DeriveProductShapedChange<Shape, KeySub> = {} as never;
		for (const key of keys) {
			// @ts-expect-error Bypassing `readonly`
			change1[key] = change[key as KeySub];
		}
		return change1;
	}
}
