import { BaseProductShapedTuple } from "@/product";
import type { AnyApply, InferApplyValue } from "@/types/algebra";
import type {
	AnyTuple,
	DeriveTupleChange,
	DeriveTupleValue,
	KeyOfTuple,
	Tuple$,
} from "./types";

export type * from "./types";

export class ATuple<Shape extends AnyTuple<AnyApply>>
	extends BaseProductShapedTuple<DeriveTupleValue<Shape>, Shape>
	implements Tuple$<Shape>
{
	readonly $type = "tuple";

	override assign(
		value: DeriveTupleValue<Shape>,
		change: DeriveTupleChange<Shape>,
	): DeriveTupleValue<Shape> {
		const value1: typeof value = [...value];
		for (const key of this.keys) {
			// @ts-expect-error Bypassing readonly
			value1[key] = change[key];
		}
		return value1;
	}

	override get<K extends KeyOfTuple<Shape>>(
		value: DeriveTupleValue<Shape>,
		key: K,
	): InferApplyValue<Shape[K]> {
		// @ts-expect-error Can't be checked
		return value[key];
	}
}

export const tuple = <Shape extends AnyTuple<AnyApply>>(shape: Shape) =>
	new ATuple<Shape>(
		shape,
		Array(shape.length)
			.fill(null)
			.map((_, i) => i) as never[],
	);
