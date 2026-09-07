import { type AConstant, nullType } from "@/constant";
import { type ASingleKey, singleKey } from "@/map";
import type { $A } from "@/types/algebra";
import { type AUnion, union } from "@/union";

export * from "./func";

export type ANone = AConstant<null, null>;

export type ASome<A extends $A> = ASingleKey<"value", A>;

export type AOption<A extends $A> = AUnion<{
	some: ASome<A>;
	none: ANone;
}>;

export const option = <A extends $A>(a: A): AOption<A> =>
	union({ some: singleKey("value", a), none: nullType() }, (x) =>
		x === null ? "none" : "some",
	);
