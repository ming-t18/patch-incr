import { liftPatches, type Patches } from "patch-incr/patch";
import { projectPatches } from "patch-incr/patch/helpers";
import type { AnyRecord } from "patch-incr/patchSchema/types";
import * as Dv from "./dv";
import type { AnyDV, DV, InferV } from "./types";

export type InferAssignReturn<
	Base extends AnyRecord,
	Assigns extends Record<string | number, AnyDV>,
> = Base & { [key in keyof Assigns]: InferV<Assigns[key]> };

export const assign = <
	Base extends AnyRecord,
	Assigns extends Record<string | number, AnyDV>,
>(
	pBase: DV<Base>,
	assigns: Assigns,
): DV<InferAssignReturn<Base, Assigns>> => {
	type R = InferAssignReturn<Base, Assigns>;
	const [base, dBase] = Dv.toPair(pBase);
	const dRes: Patches<R> = dBase ? [...(dBase as Patches<never>)] : [];
	const res: R = { ...base } as R;
	for (const [key, pInner] of Object.entries(assigns)) {
		const [inner, dInner] = Dv.toPair(pInner);
		// @ts-expect-error Assigning by key
		res[key] = inner;
		if (!dInner) {
			continue;
		}
		dRes.push(...(liftPatches(key, dInner) as Patches<never>));
	}
	return Dv.create(res, dRes);
};

export const access = <Base extends AnyRecord, Key extends keyof Base>(
	base: DV<Base>,
	key: Key,
): DV<Base[Key]> => {
	const [x, dx] = Dv.toPair(base);
	const inner = x[key];
	if (dx === null) {
		return Dv.create(inner);
	}

	const dInner: Patches<Base[Key]> | undefined =
		projectPatches(key as never, dx) ?? undefined;
	return Dv.create(inner, dInner);
};
