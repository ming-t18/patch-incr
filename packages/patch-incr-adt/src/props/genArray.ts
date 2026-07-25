import { AArrayStack, type DeriveArrayStackChange } from "@/array/stack";
import type { $D, $T } from "@/types";

import "./types";
import fc from "fast-check";
import { arbEmptyOrReplace, DRO_WEIGHT, MAX_ARRAY_LEN } from "./genUtils";
import { diveArbChangeConfig } from "./opts";
import type { Arb, ArbApply, ArbChangeConfig, HasArbApply } from "./types";
export class ArbArrayStack<
	A extends AArrayStack<AInner, T, DT>,
	AInner extends HasArbApply<T, DT>,
	T = $T<AInner>,
	DT = $D<AInner>,
> implements ArbApply<A, readonly T[], DeriveArrayStackChange<T, DT>>
{
	constructor(readonly apply: A) {}
	arbValue(): Arb<readonly T[]> {
		return fc.array(this.apply.inner.getArbApply().arbValue(), {
			minLength: 0,
			maxLength: MAX_ARRAY_LEN,
		});
	}

	arbChange(
		opts?: ArbChangeConfig<readonly T[]> | undefined,
	): Arb<DeriveArrayStackChange<T, DT>> {
		const repPart = arbEmptyOrReplace(this.apply, this.arbValue());
		const arrLen = opts?.value?.length;
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
			: fc.array(arbInner.arbChange(), {
					minLength: 0,
					maxLength: MAX_ARRAY_LEN,
				});

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
						toPush: this.arbValue(),
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
