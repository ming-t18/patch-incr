import { ARecord } from "@/record";
import type { AnyApply, ReplaceOnly } from "@/types/algebra";
import type { DeriveTupleChange, DeriveTupleValue, Tuple$ } from "./types";

export type * from "./types";

export class ATuple<Tup extends AnyApply[]> implements Tuple$<Tup> {
	readonly $type = "tuple";
	// biome-ignore lint/suspicious/noExplicitAny: re-using code for ARecord, can't be type checked
	readonly #record: ARecord<any, any>;
	readonly empty: DeriveTupleChange<Tup>;
	constructor(readonly shape: Tup) {
		// We could do inheritance instead of composition to avoid forwarding methods, but this will break the impl for Tuple$
		this.#record = new ARecord(
			shape,
			Array(shape.length)
				.fill(null)
				.map((_, i) => i),
		);
		this.empty = this.#record.empty as never;
	}

	apply(
		value: DeriveTupleValue<Tup>,
		change: DeriveTupleChange<Tup>,
	): DeriveTupleValue<Tup> {
		// @ts-expect-error re-using code for ARecord, can't be type checked
		return this.#record.apply(value, change);
	}

	fromReplace(value: DeriveTupleValue<Tup>): DeriveTupleChange<Tup> {
		// @ts-expect-error re-using code for ARecord, can't be type checked
		return this.#record.fromReplace(value);
	}

	isReplace(
		value: DeriveTupleChange<Tup>,
	): ReplaceOnly<DeriveTupleValue<Tup>> | null {
		// @ts-expect-error re-using code for ARecord, can't be type checked
		return this.#record.isReplace(value);
	}

	combine(
		a: DeriveTupleChange<Tup>,
		b: DeriveTupleChange<Tup>,
	): DeriveTupleChange<Tup> {
		// @ts-expect-error re-using code for ARecord, can't be type checked
		return this.#record.combine(a, b);
	}

	isEmpty(value: DeriveTupleChange<Tup>): boolean {
		return this.#record.isEmpty(value);
	}
}

export const tuple = <Tup extends AnyApply[]>(tup: Tup) => new ATuple<Tup>(tup);

export const pair = <A extends AnyApply, B extends AnyApply>(a: A, b: B) =>
	new ATuple([a, b]);
