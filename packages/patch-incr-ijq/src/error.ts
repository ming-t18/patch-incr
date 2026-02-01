import type { Ijq } from "./type";

export function errorKind(func: never): never {
	throw new Error(
		`Invalid FuncKind: ${(func as Ijq<unknown, unknown>)?.kind ?? ""}`,
	);
}
