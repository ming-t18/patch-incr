import { nullType } from "@/constant";
import { record } from "@/record";
import type { AnyApply } from "@/types/algebra";
import { union } from "@/union";

export const option = <A extends AnyApply>(a: A) =>
	union({ some: record({ value: a }), none: nullType() }, (x) =>
		x === null ? "none" : "some",
	);
