import { describe, expect, it } from "bun:test";
import type { GenWithPatches } from "@test/genPatched.test";
import * as gp from "@test/genPatched.test";
import { propsForIF } from "@test/props.test";
import fc from "fast-check";
import { constant, identity } from "@/builder";
import type { ILens, ITraversal } from "@/optics";
import type { IF } from "@/types";

export const propGetSet =
	<T, A, F = never>(l: ILens<T, A, F>) =>
	(p: [T, A]) => {
		expect(l.get.evaluate(l.set.evaluate(p))).toStrictEqual(p[1]);
	};

export const propSetGet =
	<T, A, F = never>(l: ILens<T, A, F>) =>
	(t: T) => {
		const setGet = l.set.evaluate([t, l.get.evaluate(t)]);
		expect(setGet).toStrictEqual(t);
	};

export const propSetSet =
	<T, A, F = never>(l: ILens<T, A, F>) =>
	(p: [T, A]) => {
		const t1 = l.set.evaluate(p);
		expect(l.set.evaluate([t1, p[1]])).toStrictEqual(t1);
	};

export const propOverSetId =
	<T, A, F = never>(l: ILens<T, A, F>) =>
	(t: T) => {
		expect(l.over(identity()).evaluate(t)).toStrictEqual(t);
	};

export const propOverGetSet =
	<T, A, F = never>(l: ILens<T, A, F>) =>
	(t: T) => {
		const v = l.get.evaluate(t);
		expect(l.over(constant(v)).evaluate(t)).toStrictEqual(t);
	};

export const propOverSetGet =
	<T, A, F = never>(l: ILens<T, A, F>) =>
	(t: T) => {
		const setGet = l.over(constant(l.get.evaluate(t)));
		expect(setGet.evaluate(t)).toStrictEqual(t);
	};

export const propOverSetSet =
	<T, A, F = never>(l: ILens<T, A, F>) =>
	(t: T, v: A) => {
		const set = l.over(constant(v));
		const t1 = set.evaluate(t);
		expect(set.evaluate(t1)).toStrictEqual(t1);
	};

export const propsForLens = <T, A, F = never, Z = undefined>(
	genT: GenWithPatches<T>,
	genA: GenWithPatches<A>,
	getL: (value: Z) => ILens<T, A, F>,
	arb = fc.constant(undefined) as fc.Arbitrary<Z>,
) => {
	const genL = arb.map(getL);
	const genPair = gp.tuple(genT, genA);
	describe("set props", () => {
		it("get-set", () => {
			fc.assert(
				fc.property(genL, genPair.arb(), (l, { value: p }) => propGetSet(l)(p)),
			);
		});

		it("set-get", () => {
			fc.assert(
				fc.property(genL, genT.arb(), (l, { value: t }) => propSetGet(l)(t)),
			);
		});

		it("set-set", () => {
			fc.assert(
				fc.property(
					genL,
					genT.arb(),
					genA.arb(),
					(l, { value: t }, { value: v }) => propOverSetSet(l)(t, v),
				),
			);
		});
	});
	describe("set props with over", () => {
		it("set-identity", () => {
			fc.assert(
				fc.property(genL, genT.arb(), (l, { value: t }) => propOverSetId(l)(t)),
			);
		});

		it("get-set", () => {
			fc.assert(
				fc.property(genL, genT.arb(), (l, { value: t }) =>
					propOverGetSet(l)(t),
				),
			);
		});

		it("set-get", () => {
			fc.assert(
				fc.property(genL, genT.arb(), (l, { value: t }) =>
					propOverSetGet(l)(t),
				),
			);
		});

		it("set-set", () => {
			fc.assert(
				fc.property(
					genL,
					genT.arb(),
					genA.arb(),
					(l, { value: t }, { value: v }) => propOverSetSet(l)(t, v),
				),
			);
		});
	});
};

export const propsForTraversalIF = <T, A, F = never, Z = undefined>(
	genT: GenWithPatches<T>,
	genA: GenWithPatches<A>,
	getOptics: (value: Z) => ITraversal<T, A, F>,
	arb = fc.constant(undefined) as fc.Arbitrary<Z>,
) => {
	describe("get", () => {
		propsForIF(genT, (z: Z) => getOptics(z).getMulti, arb);
	});
	describe("over", () => {
		const entries: [string, fc.Arbitrary<IF<A, A>>][] = [
			["over(identity)", fc.constant(identity<A>())],
			["over(constant)", genA.arb().map(({ value }) => constant<A, A>(value))],
		];
		describe.each(entries)("%s", (_name, genF) => {
			propsForIF(
				genT,
				([z, f]): IF<T, T> => getOptics(z).over(f),
				fc.tuple(arb, genF),
			);
		});
	});
};
