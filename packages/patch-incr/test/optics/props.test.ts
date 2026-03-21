import { describe, expect, it } from "bun:test";
import type { GenWithPatches } from "@test/genPatched.test";
import { type It, propsForIF } from "@test/props.test";
import fc from "fast-check";
import { constant, identity } from "@/builder";
import {
	type ILens,
	type IOptics,
	type ITraversal,
	toTraversal,
} from "@/optics";
import type { IF } from "@/types";

export const propSetId =
	<T, A, F = never>(l: ILens<T, A, F>) =>
	(t: T) => {
		expect(l.set(identity()).evaluate(t)).toStrictEqual(t);
	};

export const propGetSet =
	<T, A, F = never>(l: ILens<T, A, F>) =>
	(t: T) => {
		const v = l.get.evaluate(t);
		expect(l.set(constant(v)).evaluate(t)).toStrictEqual(t);
	};

export const propSetGet =
	<T, A, F = never>(l: ILens<T, A, F>) =>
	(t: T) => {
		const setGet = l.set(constant(l.get.evaluate(t)));
		expect(setGet.evaluate(t)).toStrictEqual(t);
	};

export const propSetSet =
	<T, A, F = never>(l: ILens<T, A, F>) =>
	(t: T, v: A) => {
		const set = l.set(constant(v));
		const t1 = set.evaluate(t);
		expect(set.evaluate(t1)).toStrictEqual(t);
	};

export const propsForLens = <T, A, F = never, Z = undefined>(
	genT: GenWithPatches<T>,
	genA: GenWithPatches<A>,
	getL: (value: Z) => ILens<T, A, F>,
	arb = fc.constant(undefined) as fc.Arbitrary<Z>,
) => {
	const genL = arb.map(getL);
	it("set-identity", () => {
		fc.assert(
			fc.property(genL, genT.arb(), (l, { value: t }) => propSetId(l)(t)),
		);
	});

	it("get-set", () => {
		fc.assert(
			fc.property(genL, genT.arb(), (l, { value: t }) => propGetSet(l)(t)),
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
				(l, { value: t }, { value: v }) => propSetGet(l)(t, v),
			),
		);
	});
};

export const propsForTraversalIF = <T, A, F = never, Z = undefined>(
	genT: GenWithPatches<T>,
	genA: GenWithPatches<A>,
	getOptics: (value: Z) => ITraversal<T, A, F>,
	arb = fc.constant(undefined) as fc.Arbitrary<Z>,
) => {
	describe("get", () => {
		propsForIF(it, genT, (z: Z) => getOptics(z).getMulti, arb);
	});
	describe("set", () => {
		const entries: [string, fc.Arbitrary<IF<A, A>>][] = [
			["set(identity)", fc.constant(identity<A>())],
			["set(constant)", genA.arb().map(({ value }) => constant<A, A>(value))],
		];
		describe.each(entries)("%s", (_name, genF) => {
			propsForIF(
				it,
				genT,
				([z, f]): IF<T, T> => getOptics(z).set(f),
				fc.tuple(arb, genF),
			);
		});
	});
};
