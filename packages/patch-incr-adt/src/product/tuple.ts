import { getReplaceOnly, isReplaceOnly, makeReplaceOnly } from "@/replaceOnly";
import type { AnyTuple, KeyOfTuple } from "@/tuple/types";
import {
	type AnyApply,
	type Apply,
	BaseApplyClass,
	type InferApplyValue,
	type ReplaceOnly,
} from "@/types";
import type {
	ApplyProductShapedTuple,
	DeriveProductChangeTuple,
	DeriveProductShapedChangeTuple,
} from "./types";

const range = (n: number): Readonly<number[]> =>
	Array(n)
		.fill(null)
		.map((_, i) => i);
export abstract class BaseProductShapedTuple<
		Prod,
		Shape extends AnyTuple<AnyApply>,
	>
	extends BaseApplyClass<Prod, DeriveProductChangeTuple<Prod, Shape>, null>
	implements
		Apply<Prod, DeriveProductChangeTuple<Prod, Shape>>,
		ApplyProductShapedTuple<Prod, Shape>
{
	declare "~apply": {
		readonly value: Prod;
		readonly change: DeriveProductChangeTuple<Prod, Shape>;
	};

	constructor(
		readonly shape: Shape,
		readonly keys = range(shape.length),
	) {
		super(null);
	}

	abstract assign(
		value: Prod,
		change: DeriveProductShapedChangeTuple<Shape>,
	): Prod;
	abstract get<K extends KeyOfTuple<Shape>>(
		value: Prod,
		key: K,
	): InferApplyValue<Shape[K]>;

	apply(value: Prod, change: DeriveProductChangeTuple<Prod, Shape>): Prod {
		if (change === null) {
			return value;
		}
		if (isReplaceOnly<Prod>(change)) {
			return getReplaceOnly(change);
		}

		const change1: DeriveProductShapedChangeTuple<Shape> = [
			...this.keys,
		] as never;
		for (const key of this.keys) {
			// @ts-expect-error Can't be checked
			const changeKey: never = change[key];
			// @ts-expect-error Can't be checked
			change1[key] = this.shape[key].apply(
				this.get(value, key as never),
				changeKey,
			);
		}
		return this.assign(value, change1);
	}

	override canApply(
		value: Prod,
		change: DeriveProductChangeTuple<Prod, Shape>,
	): boolean {
		if (change === null || isReplaceOnly(change)) {
			return true;
		}

		for (const key of this.keys) {
			// @ts-expect-error Can't be checked
			if (!this.shape[key].canApply(this.get(value, key), change[key])) {
				return false;
			}
		}
		return true;
	}

	fromReplace(value: Prod): ReplaceOnly<Prod> {
		return makeReplaceOnly(value);
	}

	isReplace(
		change: DeriveProductChangeTuple<Prod, Shape>,
	): ReplaceOnly<Prod> | null {
		if (isReplaceOnly(change)) {
			return change;
		}
		return null;
	}
	combine(
		a: DeriveProductChangeTuple<Prod, Shape>,
		b: DeriveProductChangeTuple<Prod, Shape>,
	): DeriveProductChangeTuple<Prod, Shape> {
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
		const c = [...a] as typeof a;
		for (const key of this.keys) {
			// @ts-expect-error Can't be checked
			c[key] = this.shape[key].combine(c[key], b[key]);
		}
		return c;
	}
	isEmpty(change: DeriveProductChangeTuple<Prod, Shape>) {
		return change === null;
	}

	project(
		keys: KeyOfTuple<Shape>[],
		change: DeriveProductChangeTuple<Prod, Shape>,
	): DeriveProductShapedChangeTuple<Shape> {
		const change1: DeriveProductShapedChangeTuple<Shape> = [
			...this.keys,
		] as never;
		for (const key of keys) {
			// @ts-expect-error Bypassing `readonly`
			change1[key] = change[key as KeySub];
		}
		return change1;
	}
}
