import type { Patches } from "@/patch";
import type { IF } from "@/types";

export interface IIso<A, B, DA = Patches<A>, DB = Patches<B>> {
	fw: IF<A, B, DA, DB>;
	bw: IF<B, A, DB, DA>;
}
