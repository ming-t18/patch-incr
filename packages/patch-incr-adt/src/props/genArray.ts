/** biome-ignore-all lint/style/noNonNullAssertion: array indexing */
import { AArrayStack, type DeriveArrayStackChange } from "@/array/stack";
import type { $D, $T } from "@/types";

import "./types";
import fc from "fast-check";
import { AArray, type DeriveArrayChange } from "@/array";
import {
	mergeAdjacents,
	type ParApplyEntry,
	type ParSpliceEntry,
	SpliceTable,
} from "@/array/splice";
import { arbEmptyOrReplace, DRO_WEIGHT, MAX_ARRAY_LEN } from "./genUtils";
import { DEFAULT_DEPTH, diveArbChangeConfig } from "./opts";
import type { Arb, ArbApply, ArbChangeConfig, HasArbApply } from "./types";
export class ArbArrayStack<
	A extends AArrayStack<AInner, T, DT>,
	AInner extends HasArbApply<T, DT>,
	T = $T<AInner>,
	DT = $D<AInner>,
> implements ArbApply<A, readonly T[], DeriveArrayStackChange<T, DT>>
{
	constructor(readonly apply: A) {}

	arbValue(depth: number): Arb<readonly T[]> {
		return arbArrayValue(this.apply.inner, depth);
	}

	arbChange(
		opts: ArbChangeConfig<readonly T[]>,
	): Arb<DeriveArrayStackChange<T, DT>> {
		const repPart = arbEmptyOrReplace(
			this.apply,
			this.arbValue(opts.depth ?? DEFAULT_DEPTH),
		);
		const arrLen = opts.value?.length;
		const minLen = arrLen ?? 0;
		const arbInner = this.apply.inner.getArbApply();
		const toApplyArr: Arb<DT[]> = opts
			? fc.integer({ min: 0, max: MAX_ARRAY_LEN }).chain(
					(n): Arb<DT[]> =>
						fc.tuple<DT[]>(
							...Array(Math.min(n, arrLen ?? n))
								.fill(null)
								.map(
									(_, i): Arb<DT> =>
										arbInner.arbChange(
											diveArbChangeConfig(
												(xs: readonly T[]): T => xs[i] as T,
												opts,
											),
										),
								),
						),
				)
			: fc.array(
					arbInner.arbChange(
						diveArbChangeConfig(() => {
							throw new Error();
						}, opts),
					),
					{
						minLength: 0,
						maxLength: MAX_ARRAY_LEN,
					},
				);

		const arbToPop = fc.oneof(
			// [0..n]
			{
				weight: 1,
				arbitrary: fc.integer({
					min: 0,
					max: minLen === 0 ? MAX_ARRAY_LEN : minLen,
				}),
			},
			// [0..n/3]
			{
				weight: 4,
				arbitrary: fc.integer({
					min: 0,
					max: minLen > 3 ? Math.floor(minLen / 3) : 1,
				}),
			},
			// [0]
			{ weight: 2, arbitrary: fc.constant(0) },
			// Pop-all part
			...(minLen > 0 ? [{ weight: 3, arbitrary: fc.constant(minLen) }] : []),
		);
		return fc.oneof(
			{
				weight: opts?.droWeight ?? DRO_WEIGHT,
				arbitrary: repPart,
			},
			{
				weight: 1,
				arbitrary: fc
					.record({
						expectedLength:
							typeof arrLen === "number"
								? fc.constant(arrLen)
								: fc.integer({ min: 0, max: MAX_ARRAY_LEN }),
						toApplyArr,
						toPop: arbToPop,
						toPush: this.arbValue(opts?.depth ?? DEFAULT_DEPTH),
					})
					.chain((res) => {
						const { toPop } = res;
						if (typeof arrLen === "number" && arrLen - toPop <= 0) {
							if (arrLen === 0) {
								return fc.constant({ ...res, toPop: 0 });
							}
							return fc.integer({ min: 0, max: arrLen }).map((x) => ({
								...res,
								toPop: x,
							}));
						}
						return fc.constant(res);
					})
					.map(
						({
							expectedLength,
							toApplyArr,
							toPop,
							toPush,
						}): DeriveArrayStackChange<T, DT> => {
							const toApply: Map<number, DT> = new Map();
							const len1 = expectedLength - toPop;
							for (let i = 0; i < Math.min(toApplyArr.length, len1); i++) {
								toApply.set(i, toApplyArr[i] as DT);
							}
							return {
								expectedLength,
								toApply,
								toPop,
								toPush,
							};
						},
					),
			},
		);
	}
}

AArrayStack.prototype.getArbApply = function <
	AInner extends HasArbApply<T, DT>,
	T = $T<AInner>,
	DT = $D<AInner>,
>(this: AArrayStack<AInner, T, DT>) {
	return new ArbArrayStack(this);
};

export class ArbArray<
	A extends AArray<AInner, T, DT>,
	AInner extends HasArbApply<T, DT>,
	T = $T<AInner>,
	DT = $D<AInner>,
> implements ArbApply<A, readonly T[], DeriveArrayChange<T, DT>>
{
	constructor(readonly apply: A) {}

	arbValue(depth: number): Arb<readonly T[]> {
		return arbArrayValue(this.apply.inner, depth);
	}

	arbChange(
		opts: ArbChangeConfig<readonly T[]>,
	): Arb<DeriveArrayChange<T, DT>> {
		const inner = this.apply.inner;
		const arbValue = inner.getArbApply().arbValue(opts.depth);
		const droPart = {
			weight: 1,
			arbitrary: arbEmptyOrReplace(this.apply, this.arbValue(opts.depth)),
		};
		const spliceTablePart = {
			weight: 4,
			arbitrary: arbSpliceTable({
				arbValue,
				arbChange: (i) =>
					inner
						.getArbApply()
						.arbChange(diveArbChangeConfig((x) => x[i] as T, opts)),
			}),
		};

		return fc.oneof(droPart, spliceTablePart);
	}
}

AArray.prototype.getArbApply = function <
	AInner extends HasArbApply<T, DT>,
	T = $T<AInner>,
	DT = $D<AInner>,
>(this: AArray<AInner, T, DT>) {
	return new ArbArray(this);
};

function arbArrayValue<T, DT>(
	inner: HasArbApply<T, DT>,
	depth: number,
): Arb<readonly T[]> {
	if (depth <= 0) {
		return fc.constant([]);
	}
	return fc.array(inner.getArbApply().arbValue(depth - 1), {
		minLength: 0,
		maxLength: MAX_ARRAY_LEN,
	});
}

export function arbSpliceTable<T, DT>(opts: {
	maxLength?: number;
	maxEntries?: number;
	maxReplaceLength?: number;
	arbValue: Arb<T>;
	arbChange?: (index: number) => Arb<DT>;
}): Arb<SpliceTable<T, DT>> {
	const {
		maxLength = MAX_ARRAY_LEN,
		maxEntries = MAX_ARRAY_LEN / 4,
		maxReplaceLength = MAX_ARRAY_LEN / 2,
		arbValue,
		arbChange,
	} = opts;

	return fc.integer({ min: 0, max: maxLength }).chain((arrLen) =>
		fc
			.set(fc.integer({ min: 0, max: maxEntries - 1 }))
			.map(
				(is): number[] => [...is].sort(),
				(is) => new Set<number>([...(is as number[])]),
			)
			.chain((startIdxs: number[]): Arb<{ i: number; di: number }[]> => {
				const parts: Arb<{ i: number; di: number }>[] = [];
				for (let k = 0; k < startIdxs.length; k++) {
					const i = startIdxs[k]!;
					const iNext = k + 1 === startIdxs.length ? arrLen : startIdxs[k + 1]!;
					if (iNext <= i) {
						parts.push(
							fc.record({
								i: fc.constant(i),
								di: fc.constant(0),
							}),
						);
						continue;
					}
					parts.push(
						fc.record({
							i: fc.constant(i),
							di: fc.integer({ min: 0, max: iNext - i }),
						}),
					);
				}
				return fc.tuple(...parts);
			})
			.chain((entries) =>
				fc.tuple(
					...entries.map(({ i, di }) =>
						fc.oneof(
							{
								weight: 4,
								arbitrary: fc.record({
									index: fc.constant(i),
									lenToRemove: fc.constant(di),
									replace: fc.array(arbValue, { maxLength: maxReplaceLength }),
								}) satisfies Arb<ParSpliceEntry<T>>,
							},
							...(arbChange
								? [
										{
											weight: 1,
											arbitrary: fc.record({
												index: fc.constant(i),
												change: arbChange(i),
											}) satisfies Arb<ParApplyEntry<DT>>,
										},
									]
								: []),
						),
					),
				),
			)
			.map((es) => {
				const { entries } = SpliceTable.fromParallelEntries(es);
				return new SpliceTable(mergeAdjacents(entries));
			}),
	);
}
