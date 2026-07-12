import {
	compose1,
	compose1A,
	compose1R,
	composeA,
	composeA1,
	composeAR,
	composeR,
	composeR1,
	composeRA,
} from "@/funcs";
import type { $A } from "@/types/abbr";
import { type IF, IFKind, type IFR } from "@/types/func";

export const compose = <A extends $A, B extends $A, C extends $A>(
	f1: IF<A, B>,
	f2: IF<B, C>,
): IF<A, C> => {
	if (f1.kind === IFKind.IFA) {
		if (f2.kind === IFKind.IFA) {
			return composeA(f1, f2);
		}
		if (f2.kind === IFKind.IF1) {
			return composeA1(f1, f2);
		}
		if (f2.kind === IFKind.IFR) {
			return composeAR(f1, f2);
		}
		return f2 satisfies never;
	}
	if (f1.kind === IFKind.IF1) {
		if (f2.kind === IFKind.IFA) {
			return compose1A(f1, f2);
		}
		if (f2.kind === IFKind.IF1) {
			return compose1(f1, f2);
		}
		if (f2.kind === IFKind.IFR) {
			// biome-ignore lint/suspicious/noExplicitAny: AnyApply causes type errors
			return compose1R(f1, f2) as IFR<A, C, any>;
		}
		return f2 satisfies never;
	}
	if (f1.kind === IFKind.IFR) {
		if (f2.kind === IFKind.IFA) {
			// biome-ignore lint/suspicious/noExplicitAny: AnyApply causes type errors
			return composeRA(f1, f2) as IFR<A, C, any>;
		}
		if (f2.kind === IFKind.IF1) {
			// biome-ignore lint/suspicious/noExplicitAny: AnyApply causes type errors
			return composeR1(f1, f2) as IFR<A, C, any>;
		}
		if (f2.kind === IFKind.IFR) {
			// biome-ignore lint/suspicious/noExplicitAny: AnyApply causes type errors
			return composeR(f1, f2) as IFR<A, C, any>;
		}
		return f2 satisfies never;
	}
	return f1 satisfies never;
};
