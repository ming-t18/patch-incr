import fc from "fast-check";
import type { ApplyCombine } from "../../algebra";
import { filter, map } from "../../data/array";
import { access } from "../../data/struct";
import {
	type DF,
	type DP,
	dfCond,
	dfFromAtomic,
	dfFromIFWeakMap,
} from "../../dual";
import { dfAccess } from "../../dual/access";
import { apply0 } from "../../dual/apply0";
import { dp, dpr } from "../../dual/dp";
import * as ps from "../../patchSchema";
import * as gp from "../helpers/genPatched.test";

export const dualPatchCoherent = <X, Y, DX, DY>(
	xd: DP<X, DX>,
	f: DF<X, Y, DX, DY>,
	ax: ApplyCombine<X, DX>,
	ay: ApplyCombine<Y, DY>,
) => {
	if (!xd[2]) {
		const yd0 = f(xd);
		if (yd0[2]) {
			expect(ay.isEmpty(yd0[1])).toBe(true);
			return;
		}
		expect(yd0[2]).toBe(false);
		return;
	}

	const yd = f(xd);
	if (!yd[2]) {
		return;
	}

	const [x, dx] = xd;
	const [y, dy] = yd;
	const x1 = ax.apply(x, dx);
	const y1Expected = ay.apply(y, dy);
	expect(apply0(f, x1)).toStrictEqual(y1Expected);
};

describe("dfCond", () => {
	it("patch coherent on atomics", () => {
		const applyX = ps.atomic<number>();
		const applyY = ps.atomic<number>();
		const f = dfCond(
			(x: number) => x % 2 === 0,
			dfFromAtomic((x: number) => -x, applyX, applyY),
			dfFromAtomic((x: number) => x * 2, applyX, applyY),
			applyX,
			applyY,
		);
		fc.assert(
			fc.property(fc.integer(), fc.integer(), (x0, x1) => {
				dualPatchCoherent(dpr(x0, x1, applyX), f, applyX, applyY);
			}),
		);
	});

	it("patch coherent on lists", () => {
		const schemaInput = ps.array(
			ps.tuple(ps.atomic<number>(), ps.atomic<boolean>()),
		);
		const schemaOutput = ps.array(ps.atomic<number>());
		const filtering = dfFromIFWeakMap(filter(([_, f]: [number, boolean]) => f));
		const mapping = dfFromIFWeakMap(map<[number, boolean], number>(access(0)));
		const a0 = dfAccess<[[number, boolean][], number[]]>()(0);
		const f: DF<[number, boolean][], number[]> = (xd) => {
			const filtered: DP<[number, boolean][]> = a0(filtering(xd));
			const m0: DP<number[]> = mapping(filtered);
			return m0;
		};

		fc.assert(
			fc.property(
				gp.array(gp.tuple(gp.integer(), gp.boolean())).arb(),
				({ value, patches }) => {
					dualPatchCoherent(dp(value, patches), f, schemaInput, schemaOutput);
				},
			),
		);
	});
});
