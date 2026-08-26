import type { IReader } from "@/funcs/reader";
import * as Reader from "@/funcs/reader";
import type { APair } from "@/pair";
import type { $A, IF } from "@/types";
import { unitType } from "@/unit";
import type { ISetter } from "./types";

export const setterFromModify =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		_s: S,
		_t: T,
		a: A,
		b: B,
	) =>
	(
		modify: <Ctx extends $A>(func: IReader<Ctx, A, B>) => IReader<Ctx, S, T>,
	): ISetter<S, T, A, B> => {
		const set = modify(Reader.ask(b)(a));
		const set0: IF<APair<S, B>, T> = Reader.runReader(set);
		const nullCtx = unitType;
		return {
			set,
			set0,
			modify0: (f) =>
				Reader.runConstantCtx(modify(Reader.lift(nullCtx)(f)), null),
			modify,
			modifyC: (func) => Reader.runReader(modify(Reader.fromReader(func))),
		};
	};
