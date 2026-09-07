import type { RecBrand } from "@/props";
import type { $A } from "@/types/algebra";

/** Add a brand for a type being recursive. */
export const recBrand = <A extends $A>(x: A): A & RecBrand => x;
