import type { PatchSchema } from "@/patchSchema/types";
import type { Patches } from "@/types";

export type { IF, Patches } from "@/types";

/** An equality-checking predicate. */
export type Eq<A> = (a: A, b: A) => boolean;

export type Applier<A, DA = Patches<A>> = (a: A, da: DA) => A;

export interface PatchCoherentParams<X, Y, DX = Patches<X>, DY = Patches<Y>> {
	equalsY: Eq<Y>;
	schemaX: PatchSchema<X, DX>;
	schemaY: PatchSchema<Y, DY>;
}
