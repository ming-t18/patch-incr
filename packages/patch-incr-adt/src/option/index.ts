import { type AConstant, nullType } from "@/constant";
import { type ARecord, record } from "@/record";
import type { AnyApply } from "@/types/algebra";
import { type AUnion, union } from "@/union";

export type ANone = AConstant<null, null>;

export type ASome<A extends AnyApply> = ARecord<{ value: A }>;

export type AOption<A extends AnyApply> = AUnion<{
	some: ASome<A>;
	none: ANone;
}>;

export const option = <A extends AnyApply>(a: A): AOption<A> =>
	union({ some: record({ value: a }), none: nullType() }, (x) =>
		x === null ? "none" : "some",
	);
