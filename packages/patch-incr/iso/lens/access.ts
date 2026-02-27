import * as B from "@/builder";
import { composeMemo, composeReeval } from "@/builder/compose";
import * as P from "@/builder/pair";
import * as S from "@/builder/struct";
import type { Merged } from "@/builder/struct/merge";
import type { AnyIF, IF } from "@/types";
import { fromPair } from "../builder";
import type { IIsoLens } from "./types";

export const accessKey = <
	Key extends string,
	Output,
	Input extends Record<Key, Output> = Record<Key, Output>,
>(
	key: Key,
): IIsoLens<Input, Output, Omit<Input, Key>> =>
	fromPair<Input, [Output, Omit<Input, Key>]>(
		P.pair(
			S.access<Output, Key, Input>(key) satisfies IF<Input, Output>,
			// Delete the key by type-casting instead of actually deleting the key with a function
			B.identity<Input>() as IF<Input, Omit<Input, Key>>,
		),
		composeReeval(
			P.swap(),
			composeMemo(
				P.second(
					S.record({ [key]: B.identity<Output>() }) as IF<
						Output,
						unknown
					> as IF<Output, Record<Key, Output>>,
				),
				S.merge() satisfies IF<
					[Omit<Input, Key>, Record<Key, Output>],
					Merged<Omit<Input, Key>, Record<Key, Output>>
				> as AnyIF as IF<[Omit<Input, Key>, Record<Key, Output>], Input>,
			),
		),
	);

export const accessKeyGeneric = <Key extends string>(
	key: Key,
): (<Output, Input extends Record<Key, Output>>() => IIsoLens<
	Input,
	Output,
	Omit<Input, Key>
>) => {
	const res = accessKey(key);
	return () => res as never;
};
