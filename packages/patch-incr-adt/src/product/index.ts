import type { DeriveRecordValue } from "@/record/types";
import type { AnyApply, InferApplyValue } from "@/types/algebra";
import { BaseProductShaped } from "./object";
import type { DeriveProductChange, ProductImpl } from "./types";

export * from "./object";
export * from "./tuple";
export type * from "./types";

export const product = <
	Prod,
	Shape extends Record<Key, AnyApply>,
	Key extends keyof Shape = keyof Shape,
>({
	shape,
	assign,
	get,
	fromRecord,
	toRecord,
}: ProductImpl<Prod, Shape, Key> & {
	shape: Shape;
	fromRecord?:
		| ((recordForm: DeriveRecordValue<Shape, Key>) => Prod)
		| undefined;
	toRecord?: ((prod: Prod) => DeriveRecordValue<Shape, Key>) | undefined;
}) => {
	class AProductImpl extends BaseProductShaped<Prod, Shape, Key> {
		declare readonly "~apply": {
			readonly value: Prod;
			readonly change: DeriveProductChange<Prod, Shape, Key>;
		};

		override readonly fromRecord: typeof fromRecord = fromRecord;
		override readonly toRecord: typeof toRecord = toRecord;
		public constructor() {
			super(shape);
			this.fromRecord = fromRecord;
			this.toRecord = toRecord;
		}

		override assign(
			value: Prod,
			change: Readonly<
				Partial<{ [k in keyof Shape]: InferApplyValue<Shape[k]> }>
			>,
		): Prod {
			return assign(value, change);
		}
		override get<K extends Key>(
			value: Prod,
			key: K,
		): InferApplyValue<Shape[K]> {
			return get(value, key);
		}
	}
	return new AProductImpl();
};
