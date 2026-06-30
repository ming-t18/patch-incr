import { type APair, pair } from "@/pair";
import type {
	BaseProductShaped,
	DeriveProductShapedChange,
	HasFromToRecord,
} from "@/product";
import type { ARecord } from "@/record";
import type { DeriveRecordValue } from "@/record/types";
import { type AOmit, type APick, omit, pick } from "@/record/utils";
import type { Evaluate, IF, IFA } from "@/types/func";
import type { $A, $D, $T } from "../types/abbr";
import { makeForward, makeForwardA } from "./helpers";

export class FProduct<
	AProd extends BaseProductShaped<Prod, Shape, Key> &
		HasFromToRecord<Prod, Shape, Key>,
	Prod = $T<AProd>,
	Shape extends Record<Key, $A> = AProd["shape"],
	Key extends keyof Shape = keyof Shape,
> {
	constructor(readonly prod: AProd) {}

	introA<A extends $A>(
		input: A,
		funcs: { [key in Key]: IFA<A, Shape[Key]> },
	): IFA<A, AProd> {
		const evaluate = (x: $T<A>): $T<AProd> =>
			this.prod.fromRecord(
				this.prod.mapShape((k1) => funcs[k1].evaluate(x)),
			) satisfies Prod as $T<AProd>;
		return {
			evaluate,
			forward: makeForwardA(input, this.prod, {
				evaluate,
				forward: (x, dx) => this.prod.mapShape((k) => funcs[k].forward(x, dx)),
			}),
			input,
			output: this.prod,
		};
	}

	intro<A extends $A>(
		input: A,
		funcs: { [key in Key]: IF<A, Shape[Key]> },
	): IF<A, AProd> {
		const evaluate = (x: $T<A>): $T<AProd> =>
			this.prod.fromRecord(
				this.prod.mapShape((k1) => funcs[k1].evaluate(x)),
			) satisfies Prod as $T<AProd>;
		return {
			evaluate,
			forward: makeForward(input, this.prod, {
				evaluate,
				forward: (x, dx, y) =>
					this.prod.mapShape((k) =>
						funcs[k].forward(x, dx, this.prod.get(y, k)),
					),
			}),
			input,
			output: this.prod,
		};
	}

	get<K extends Key>(key: K): IFA<AProd, Shape[Key]> {
		const evaluate = (x: Prod) => this.prod.get(x, key);
		return {
			evaluate,
			forward: makeForwardA(this.prod, this.prod.shape[key], {
				evaluate,
				forward: (_x, dx) =>
					this.prod.project([key], dx)?.[key] ?? this.prod.shape[key].empty,
			}),
			input: this.prod,
			output: this.prod.shape[key],
		};
	}
}

export class FRecord<
	Shape extends Record<Key, $A>,
	Key extends keyof Shape = keyof Shape,
> extends FProduct<
	ARecord<Shape, Key>,
	DeriveRecordValue<Shape, Key>,
	Shape,
	Key
> {
	// biome-ignore lint/complexity/noUselessConstructor: for reference
	constructor(record: ARecord<Shape, Key>) {
		super(record);
	}

	/** Splits up `r -> [r[k], r without k]` */
	focus<K extends Key>(
		key: K,
	): IFA<ARecord<Shape, Key>, APair<Shape[K], AOmit<Shape, Key, K>>> {
		const output: APair<Shape[K], AOmit<Shape, Key, K>> = pair(
			this.prod.shape[key],
			omit(this.prod, { [key]: true } as Record<K, true>),
		);
		const evaluate: Evaluate<ARecord<Shape, Key>, typeof output> = (
			x: DeriveRecordValue<Shape, Key>,
		) => {
			const x1 = { ...x };
			delete x1[key];
			return [
				x[key] satisfies Shape[K],
				x1 as Omit<typeof x, K> as $T<(typeof output.shape)[1]>,
			];
		};

		return {
			evaluate,
			forward: makeForwardA(this.prod, output, {
				evaluate,
				forward: (
					_x: DeriveRecordValue<Shape, Key>,
					dx: DeriveProductShapedChange<Shape, Key>,
				): $D<typeof output> => {
					const df = dx[key];
					const dx1 = { ...dx } as Omit<typeof dx, K>;
					// @ts-expect-error Deleting omitted key
					delete dx1[key];
					const prj = df ?? this.prod.shape[key].empty;
					return [prj, dx1];
				},
			}),
			input: this.prod,
			output: output,
		};
	}

	/** Splits up `r -> [r[keys], r[~keys]]` */
	partition<
		APart extends ARecord<Shape1, K>,
		Shape1 extends Record<K, $A>,
		K extends Key,
	>(
		aPart: APart,
	): IFA<
		ARecord<Shape, Key>,
		APair<APick<Shape, Key, K>, AOmit<Shape, Key, K>>
	> {
		const part: RecordPartition<Shape, Key, K> = new RecordPartition(
			this.prod.shape,
			aPart.shape,
		);
		const output: APair<APick<Shape, Key, K>, AOmit<Shape, Key, K>> = pair(
			pick(this.prod, part.toPick),
			omit(this.prod, part.toPick),
		);
		const evaluate: Evaluate<ARecord<Shape, Key>, typeof output> = (
			x: DeriveRecordValue<Shape, Key>,
		) => part.partitionRecord(x);

		return {
			evaluate,
			forward: makeForwardA(this.prod, output, {
				evaluate,
				forward: (
					_x: DeriveRecordValue<Shape, Key>,
					dx: DeriveProductShapedChange<Shape, Key>,
				) => part.partitionRecord(dx),
			}),
			input: this.prod,
			output,
		};
	}

	/** Inverse of partition. `r -> [r[keys], r[~keys]]` */
	merge<
		APicked extends ARecord<ShapePicked, KPicked>,
		ShapePicked extends Record<KPicked, $A>,
		KPicked extends Key,
	>(
		aPick: APicked,
	): IFA<APair<APicked, AOmit<Shape, Key, KPicked>>, ARecord<Shape, Key>> {
		const part: RecordPartition<Shape, Key, KPicked> = new RecordPartition(
			this.prod.shape,
			aPick.shape,
		);
		const input: APair<APicked, AOmit<Shape, Key, KPicked>> = pair(
			aPick,
			omit(this.prod, part.toPick),
		);
		const evaluate: Evaluate<typeof input, ARecord<Shape, Key>> = ([xl, xr]) =>
			part.mergeRecord(xl, xr);

		return {
			evaluate,
			forward: makeForwardA(input, this.prod, {
				evaluate,
				forward: (
					_pair,
					[dxl, dxr]: readonly [
						DeriveProductShapedChange<Shape, Key>,
						DeriveProductShapedChange<Shape, Key>,
					],
				): $D<ARecord<Shape, Key>> =>
					part.mergeRecord<DeriveProductShapedChange<Shape, Key>>(dxl, dxr),
			}),
			input,
			output: this.prod,
		};
	}
}

/** Class for partitioning a record shape into picked and omitted keys. */
export class RecordPartition<
	Shape extends Record<Key, unknown>,
	Key extends keyof Shape = keyof Shape,
	Picked extends Key = never,
> {
	constructor(
		readonly shape: Shape,
		readonly toPick: Record<Picked, unknown>,
		readonly shapeKeys = Object.keys(shape),
		readonly toPickKeys = Object.keys(toPick),
	) {}

	isPicked(key: Key): key is Picked {
		return Object.hasOwn(this.toPick, key);
	}

	partitionRecord<R extends Partial<Record<Key, unknown>>>(
		x: R,
	): [Pick<R, Picked>, Omit<R, Picked>] {
		const xIn: Pick<R, Picked> = {} as never;
		const xOut: Omit<R, Picked> = {} as never;
		for (const key of this.shapeKeys) {
			if (!Object.hasOwn(x, key)) {
				continue;
			}
			if (Object.hasOwn(this.toPick, key)) {
				// @ts-expect-error key is from picked part
				xIn[key] = x[key];
			} else {
				// @ts-expect-error key is from omitted part
				xOut[key] = x[key];
			}
		}
		return [xIn, xOut];
	}

	mergeRecord<R extends Partial<Record<Key, unknown>>>(
		left: Pick<R, Picked>,
		right: Omit<R, Picked>,
	): R {
		const merged: R = {} as never;
		for (const key of this.shapeKeys) {
			if (Object.hasOwn(this.toPick, key)) {
				if (Object.hasOwn(left, key)) {
					// @ts-expect-error key is from picked part
					merged[key] = left[key];
				}
			} else {
				if (Object.hasOwn(right, key)) {
					// @ts-expect-error key is from omitted part
					merged[key] = right[key];
				}
			}
		}
		return merged;
	}
}
