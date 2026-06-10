import { AdaptSameChange } from "@/adapters";
import type {
	DeriveRecordChange,
	DeriveRecordValue,
	Record$,
} from "@/record/types";
import type { AnyApply } from "@/types/algebra";
import type { DeriveProdChangeNoReplace, ProductApply } from "./types";

export * from "./shaped";
export type * from "./types";

// @ts-expect-error Impl for apply(...)
export class AProduct<
		Prod,
		Shape extends Record<Key, AnyApply>,
		Key extends keyof Shape = keyof Shape,
		ApplyR extends Record$<Shape, Key> = Record$<Shape, Key>,
	>
	extends AdaptSameChange<
		Prod,
		DeriveRecordChange<Shape, Key>,
		DeriveRecordValue<Shape, Key>,
		ApplyR
	>
	implements ProductApply<Prod, Shape, Key>
{
	constructor(
		inner: ApplyR,
		readonly applyProd: (
			value: Prod,
			change: DeriveProdChangeNoReplace<Shape, Key>,
		) => Prod,
	) {
		super(inner, applyProd);
	}
}

export const product = <
	Prod,
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
	ApplyR extends Record$<Shape, Key> = Record$<Shape, Key>,
>(
	inner: ApplyR,
	applyProd: (
		value: Prod,
		change: DeriveProdChangeNoReplace<Shape, Key>,
	) => Prod,
) => new AProduct<Prod, Shape, Key, ApplyR>(inner, applyProd);
