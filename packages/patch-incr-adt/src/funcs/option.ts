import { Option } from "@/modules";
import { type AOption, option } from "@/option";
import type { $A, $T } from "@/types/abbr";
import type { IFA } from "@/types/func";
import type { AUnion } from "@/union";
import { type AUnionAssign, assign } from "@/union/utils";
import { makeIFA, REEVAL } from "./helpers";
import { FUnion } from "./union";

declare module "./union" {
	interface FUnion<
		Shape extends Record<Key, $A>,
		Key extends keyof Shape = keyof Shape,
	> {
		preview<K extends Key>(key: K): IFA<AUnion<Shape, Key>, AOption<Shape[K]>>;
		mapKeyA<K extends Key, B extends $A>(
			key: K,
			func: IFA<Shape[K], B>,
			newGetDiscrimant: (value: $T<AUnionAssign<Shape, K, B, Key>>) => Key,
		): IFA<AUnion<Shape, Key>, AUnionAssign<Shape, K, B, Key>>;
	}
}

FUnion.prototype.preview = function <
	Shape extends Record<Key, $A>,
	Key extends keyof Shape,
	K extends Key,
>(
	this: FUnion<Shape, Key>,
	key: K,
): IFA<AUnion<Shape, Key>, AOption<Shape[K]>> {
	const { shape, keys } = this.union;
	const val: Shape[K] = shape[key];
	const output = option(val);
	const funcs = {} as { [key1 in Key]: IFA<Shape[key1], AOption<Shape[K]>> };
	for (const key1 of keys) {
		if (key1 === key) {
			funcs[key] = Option.introSome(val);
		} else {
			funcs[key] = Option.constNone(val, val);
		}
	}
	return this.elimA<AOption<Shape[K]>>(output, funcs);
};

// @ts-expect-error Can't be checked
FUnion.prototype.mapKeyA = function <
	Shape extends Record<Key, $A>,
	Key extends keyof Shape,
	K extends Key,
	B extends $A,
>(
	this: FUnion<Shape, Key>,
	key: K,
	func: IFA<Shape[K], B>,
	newGetDiscrimant: (value: $T<AUnionAssign<Shape, K, B, Key>>) => Key,
): IFA<AUnion<Shape, Key>, AUnionAssign<Shape, K, B, Key>> {
	const input = this.union;
	const output = assign(input, key, func.output, newGetDiscrimant);
	return makeIFA(input, output, {
		evaluate: (x) => {
			if (input.getDiscrimant(x) === key) {
				return func.evaluate(x);
			}
			return x;
		},
		forward: (x, dx) => {
			const disc1 = input.getDiscrimant(x);
			const disc2 = dx.type;
			if (disc1 === key) {
				if (disc2 !== key) {
					return REEVAL;
				}
				return { type: disc1, change: func.forward(x, dx) };
			}

			if (disc2 === key) {
				return REEVAL;
			}

			// disc1 !== key && disc2 !== key
			return dx;
		},
	});
};
