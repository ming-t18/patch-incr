import { getOutput, identity } from "@/funcs/basic";
import { makeIF1, makeIFA, makeIFR, REEVAL } from "@/funcs/helpers";
import {
	type $A,
	type $D,
	type IF,
	type IF1,
	type IFA,
	IFKind,
	type IFR,
} from "@/types";
import { type AUnit, unitType } from "@/unit";
import { either, isRight } from ".";
import type { AEither } from "./types";

export const leftRightA =
	<A extends $A, B extends $A>(input: AEither<A, B>) =>
	<A1 extends $A, B1 extends $A>(
		left: IFA<A, A1>,
		right: IFA<B, B1>,
	): IFA<AEither<A, B>, AEither<A1, B1>> => {
		const either1: AEither<A1, B1> = either(getOutput(left), getOutput(right));
		return makeIFA(input, either1, {
			evaluate: (x) =>
				isRight(x)
					? { right: right.evaluate(x.right) }
					: { left: left.evaluate(x.left) },
			forward: (x, dx): $D<typeof either1> | typeof REEVAL => {
				if ("left" in x && dx.type === "left") {
					return either1.fromChangeCase(
						"left",
						left.forward(x.left, dx.change),
					);
				}
				if ("right" in x && dx.type === "right") {
					return either1.fromChangeCase(
						"right",
						right.forward(x.right, dx.change),
					);
				}

				return REEVAL;
			},
		});
	};

export const leftRight1 =
	<A extends $A, B extends $A>(input: AEither<A, B>) =>
	<A1 extends $A, B1 extends $A>(
		left: IFA<A, A1> | IF1<A, A1>,
		right: IFA<B, B1> | IF1<B, B1>,
	): IF1<AEither<A, B>, AEither<A1, B1>> => {
		const either1: AEither<A1, B1> = either(getOutput(left), getOutput(right));
		return makeIF1(input, either1, {
			evaluate: (x) =>
				isRight(x)
					? { right: right.evaluate(x.right) }
					: { left: left.evaluate(x.left) },
			forward: (x, dx, y): $D<typeof either1> | typeof REEVAL => {
				if ("left" in x && "left" in y && dx.type === "left") {
					return either1.fromChangeCase(
						"left",
						left.forward(x.left, dx.change, y.left),
					);
				}
				if ("right" in x && "right" in y && dx.type === "right") {
					return either1.fromChangeCase(
						"right",
						right.forward(x.right, dx.change, y.right),
					);
				}

				return REEVAL;
			},
		});
	};

export const leftRightR =
	<A extends $A, B extends $A>(input: AEither<A, B>) =>
	<A1 extends $A, B1 extends $A, R1 extends $A, R2 extends $A>(
		left: IFR<A, A1, R1>,
		right: IFR<B, B1, R2>,
	): IFR<AEither<A, B>, AEither<A1, B1>, AEither<R1, R2>> => {
		const either1: AEither<A1, B1> = either(
			left.output.shape[0],
			right.output.shape[0],
		);
		const eitherR: AEither<R1, R2> = either(
			left.output.shape[1],
			right.output.shape[1],
		);
		return makeIFR(input, either1, eitherR, {
			evaluate: (x) => {
				if (isRight(x)) {
					const [x1, r] = right.evaluate(x.right);
					return [{ right: x1 }, { right: r }];
				}
				const [x1, r] = left.evaluate(x.left);
				return [{ left: x1 }, { left: r }];
			},
			forward: (
				x,
				dx,
				[y, r],
			): [$D<typeof either1>, $D<typeof eitherR>] | typeof REEVAL => {
				if ("left" in x && "left" in y && "left" in r && dx.type === "left") {
					const [dy, dr] = left.output.project(
						null,
						left.forward(x.left, dx.change, [y.left, r.left]),
					);
					return [
						either1.fromChangeCase("left", dy),
						eitherR.fromChangeCase("left", dr),
					];
				}
				if (
					"right" in x &&
					"right" in y &&
					"right" in r &&
					dx.type === "right"
				) {
					const [dy, dr] = right.output.project(
						null,
						right.forward(x.right, dx.change, [y.right, r.right]),
					);
					return [
						either1.fromChangeCase("right", dy),
						eitherR.fromChangeCase("right", dr),
					];
				}

				return REEVAL;
			},
		});
	};

export const leftRightR1 =
	<A extends $A, B extends $A>(input: AEither<A, B>) =>
	<A1 extends $A, B1 extends $A, R1 extends $A>(
		left: IFR<A, A1, R1>,
		right: IFA<B, B1> | IF1<B, B1>,
	): IFR<AEither<A, B>, AEither<A1, B1>, AEither<R1, AUnit>> => {
		const either1: AEither<A1, B1> = either(left.output.shape[0], right.output);
		const eitherR: AEither<R1, AUnit> = either(left.output.shape[1], unitType);
		return makeIFR(input, either1, eitherR, {
			evaluate: (x) => {
				if (isRight(x)) {
					const x1 = right.evaluate(x.right);
					return [{ right: x1 }, { right: null }];
				}
				const [x1, r] = left.evaluate(x.left);
				return [{ left: x1 }, { left: r }];
			},
			forward: (
				x,
				dx,
				[y, r],
			): [$D<typeof either1>, $D<typeof eitherR>] | typeof REEVAL => {
				if ("left" in x && "left" in y && "left" in r && dx.type === "left") {
					const [dy, dr] = left.output.project(
						null,
						left.forward(x.left, dx.change, [y.left, r.left]),
					);
					return [
						either1.fromChangeCase("left", dy),
						eitherR.fromChangeCase("left", dr),
					];
				}
				if (
					"right" in x &&
					"right" in y &&
					"right" in r &&
					dx.type === "right"
				) {
					const dy = right.forward(x.right, dx.change, [y.right, r.right]);
					return [either1.fromChangeCase("right", dy), null];
				}

				return REEVAL;
			},
		});
	};

export const leftRightR2 =
	<A extends $A, B extends $A>(input: AEither<A, B>) =>
	<A1 extends $A, B1 extends $A, R2 extends $A>(
		left: IFA<A, A1> | IF1<A, A1>,
		right: IFR<B, B1, R2>,
	): IFR<AEither<A, B>, AEither<A1, B1>, AEither<AUnit, R2>> => {
		const either1: AEither<A1, B1> = either(left.output, right.output.shape[0]);
		const eitherR: AEither<AUnit, R2> = either(unitType, right.output.shape[1]);
		return makeIFR(input, either1, eitherR, {
			evaluate: (x) => {
				if (isRight(x)) {
					const [x1, r] = right.evaluate(x.right);
					return [{ right: x1 }, { right: r }];
				}
				const x1 = left.evaluate(x.left);
				return [{ left: x1 }, { left: null }];
			},
			forward: (
				x,
				dx,
				[y, r],
			): [$D<typeof either1>, $D<typeof eitherR>] | typeof REEVAL => {
				if ("left" in x && "left" in y && "left" in r && dx.type === "left") {
					const dy = left.forward(x.left, dx.change, [y.left, r.left]);

					return [either1.fromChangeCase("left", dy), null];
				}
				if (
					"right" in x &&
					"right" in y &&
					"right" in r &&
					dx.type === "right"
				) {
					const [dy, dr] = right.output.project(
						null,
						right.forward(x.right, dx.change, [y.right, r.right]),
					);
					return [
						either1.fromChangeCase("right", dy),
						eitherR.fromChangeCase("right", dr),
					];
				}

				return REEVAL;
			},
		});
	};

export const leftRight =
	<A extends $A, B extends $A>(input: AEither<A, B>) =>
	<A1 extends $A, B1 extends $A>(
		left: IF<A, A1>,
		right: IF<B, B1>,
	): IF<AEither<A, B>, AEither<A1, B1>> => {
		if (left.kind === IFKind.IFR) {
			if (right.kind === IFKind.IFR) {
				return leftRightR(input)(left, right);
			}
			return leftRightR1(input)(left, right);
		}
		if (right.kind === IFKind.IFR) {
			return leftRightR2(input)(left, right);
		}

		if (left.kind === IFKind.IFA && right.kind === IFKind.IFA) {
			return leftRightA(input)(left, right);
		}
		return leftRight1(input)(left, right);
	};

export const left =
	<A extends $A, B extends $A>(input: AEither<A, B>) =>
	<A1 extends $A>(left: IF<A, A1>): IF<AEither<A, B>, AEither<A1, B>> => {
		return leftRight(input)(left, identity(input.shape.right.inner));
	};

export const right =
	<A extends $A, B extends $A>(input: AEither<A, B>) =>
	<B1 extends $A>(right: IF<B, B1>): IF<AEither<A, B>, AEither<A, B1>> => {
		return leftRight(input)(identity(input.shape.left.inner), right);
	};
