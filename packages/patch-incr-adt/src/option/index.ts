import { type AConstant, nullType } from "@/constant";
import { type ARecord, record } from "@/record";
import type { AnyApply } from "@/types/algebra";
import { type AUnion, union } from "@/union";

export interface AOption<A extends AnyApply>
	extends AUnion<{
		some: ARecord<{ value: A }>;
		none: AConstant<null, null>;
	}> {}

export const option = <A extends AnyApply>(a: A): AOption<A> =>
	union({ some: record({ value: a }), none: nullType() }, (x) =>
		x === null ? "none" : "some",
	);
