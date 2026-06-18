import { record } from "@/record";
import type { AnyApply } from "@/types/algebra";
import { union } from "@/union";

export const either = <L extends AnyApply, R extends AnyApply>(
	left: L,
	right: R,
) =>
	union(
		{
			left: record({ left }),
			right: record({ right }),
		},
		(x) => ("left" in x ? "left" : "right"),
	);
