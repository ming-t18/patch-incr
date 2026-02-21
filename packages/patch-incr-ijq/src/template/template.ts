import { type OnGetSymbol, trackedProxy } from "patch-incr/tracked";
import type { EmptyCtx, Ijq } from "@/type";
import * as S from "./symbol";
import type { IjqBuilder, IjqSlot } from "./types";

const onGetSymbol: OnGetSymbol = (_, sym) => {
	if (sym === S.stream) {
		return { type: "value", result: S.stream };
	}

	throw new TypeError(`unsupported symbol: ${sym.toString()}`);
};

export const makeSlot = <T>(): IjqSlot<T> =>
	trackedProxy([], onGetSymbol) as never;

export const makeContextSlot = <T>(): IjqSlot<T> =>
	trackedProxy([S.CONTEXT_ROOT], onGetSymbol) as never;

export const ijq = <Input, Output>(
	callback: IjqBuilder<Input, Output>,
): Ijq<Input, Output> => {
	const _res = callback(makeSlot<Input>());
	throw new Error("TODO");
};

export const ijqFor = <Input>(): (<Output, Ctx extends {} = EmptyCtx>(
	callback: IjqBuilder<Input, Output>,
) => Ijq<Input, Output, Ctx>) => ijq as never;
