import type { RecBrand } from "@/props";
import type { AnyApply } from "@/types/algebra";

/** Add a brand for a type being recursive. */
export const recBrand = <A extends AnyApply>(x: A): A & RecBrand => x;
