import { FUnion } from "@/funcs";
import * as B from "@/funcs/basic";
import { FMapValue } from "@/funcs/map";
import type { $A, IF1, IFA } from "@/types";
import { type AOption, option } from ".";

export const constNone = <A extends $A, B extends $A>(
	input: A,
	output: B,
): IFA<A, AOption<B>> => {
	return B.constant(input, option(output), null);
};

export const introSome = <A extends $A>(input: A): IFA<A, AOption<A>> => {
	const opt = option(input);
	return B.composeA(
		new FMapValue(opt.shape.some).intro(),
		new FUnion(opt).introCase("some"),
	);
};

export const mapA =
	<A extends $A>(input: AOption<A>) =>
	<B extends $A>(func: IFA<A, B>): IFA<AOption<A>, AOption<B>> => {
		const output: AOption<B> = option(func.output);
		return new FUnion(input).mapKeyA(
			"some",
			B.composeA(
				B.composeA(new FMapValue(input.shape.some).elim(), func),
				new FMapValue(output.shape.some).intro(),
			),
			output.getDiscrimant,
		);
	};

export const map1 =
	<A extends $A>(input: AOption<A>) =>
	<B extends $A>(func: IF1<A, B>): IF1<AOption<A>, AOption<B>> => {
		throw new Error("TODO");
	};
