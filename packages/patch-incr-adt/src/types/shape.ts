import type { APair } from "@/pair";
import type { $A } from "@/types/algebra";

export type OverwriteShape<
	Shape extends Record<Key, $A>,
	Shape1 extends Record<Key1, $A>,
	Key extends keyof Shape = keyof Shape,
	Key1 extends keyof Shape & keyof Shape1 = keyof Shape & keyof Shape1,
> = {
	readonly [key in Key]: key extends keyof Shape1 ? Shape1[key] : Shape[key];
};

export type DistrShape<
	Shape extends Record<Key, $A>,
	T extends $A,
	Key extends keyof Shape = keyof Shape,
> = {
	readonly [key in Key]: APair<Shape[key], T>;
};
